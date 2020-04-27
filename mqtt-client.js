/**
 * mqtt-client.js
 * @author Andrew Roberts
 */

import mqtt from "mqtt";
import produce from "immer";

export function createMqttClient({ hostUrl, username, password }) {
  let client = null;
  let eventHandlers = produce({}, (draft) => {});

  // connect client to message broker,
  // configure client to dispatch events using the event handlers map,
  // and ensure a connack is received
  async function connect() {
    return new Promise((resolve, reject) => {
      client = mqtt.connect(hostUrl, {
        username: username,
        password: password,
      });
      client.on("message", (topic, message) => {
        //Iterate over all subscriptions in the subscription map
        for (let sub of Array.from(Object.keys(eventHandlers))) {
          //Replace all * in the topic filter with a .* to make it regex compatible
          let _tmp = sub.replace(/\+/g, ".*");
          //Replace all $ in the topic filter with a .* to include sys events
          let regexdSub = _tmp.replace(/\$/g, ".*");
          //if the last character is a '>', replace it with a .* to make it regex compatible
          if (sub.lastIndexOf("#") == sub.length - 1) {
            regexdSub = regexdSub
              .substring(0, regexdSub.length - 1)
              .concat(".*");
          }

          let matchRegex = new RegExp(regexdSub);
          let matched = topic.match(matchRegex);

          //if the matched index starts at 0, then the topic is a match with the topic filter
          if (matched && matched.index == 0) {
            //Edge case if the pattern is a match but the last character is a *
            if (regexdSub.lastIndexOf("*") == sub.length - 1) {
              //Check if the number of topic sections are equal
              if (regexdSub.split("/").length != topic.split("/").length) {
                return;
              }
            }
            eventHandlers[sub]({ topic, message });
          } else {
            console.error(
              `Received messages on topic ${topic}, but no corresponding handler is set.`
            );
          }
        }
      });
      client.on("error", function onConnError(error) {
        reject(error);
      });
      client.on("connect", function onConnAck() {
        console.log("MqttClient connected to broker.");
        resolve();
      });
    });
  }

  // publishes message to provided topic and ensures puback is received
  async function send(topic, message, qos = 0) {
    return new Promise((resolve, reject) => {
      // guard: prevent attempting to interact with client that does not exist
      if (!client) {
        reject("Client has not connected yet");
      }

      client.publish(
        topic,
        JSON.stringify(message),
        { qos }, // options
        function onPubAck(err) {
          // guard: err != null indicates client is disconnecting
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  // adds handler, subscribes to provided topic, and ensures suback is received
  async function addEventHandler(topic, handler, qos = 0) {
    return new Promise((resolve, reject) => {
      // guard: prevent attempting to interact with client that does not exist
      if (!client) {
        reject("Client has not connected yet");
      }
      // guard: prevent client from attempting to add duplicate event handlers
      if (topic in eventHandlers) {
        reject("Event already has a handler");
      }

      // add event handler
      eventHandlers = produce(eventHandlers, (draft) => {
        draft[topic] = handler;
      });

      // subscribe to topic on client
      client.subscribe(topic, { qos }, function onSubAck(err, granted) {
        // guard: err != null indicates a subscription error or an error that occurs when client is disconnecting
        if (err) reject(err);
        // else, subscription is verified
        console.log(
          `Suback received for topic "${granted[0].topic}" using QOS ${granted[0].qos}`
        );
        resolve();
      });
    });
  }

  // removes handler, unsubscribes from provided topic, and ensures unsuback is received
  async function removeEventHandler(topic) {
    return new Promise((resolve, reject) => {
      // guard: prevent attempting to interact with client that does not exist
      if (!client) {
        reject("Client has not connected yet");
      }
      // guard: prevent client from attempting to remove an event handler that doesn't exist
      if (!(topic in eventHandlers)) {
        reject("Cannot remove topic that does not have an associated handler");
      }

      // remove event handler
      eventHandlers = produce(eventHandlers, (draft) => {
        delete draft[topic];
      });
      // unsubscribe from topic on client
      client.unsubscribe(topic, null, function onUnsubAck(err) {
        // guard: err != null indicates an error occurs if client is disconnecting
        if (err) reject(err);
        // else, unsubscription verified
        resolve();
      });
    });
  }

  return produce({}, (draft) => {
    draft.connect = connect;
    draft.send = send;
    draft.addEventHandler = addEventHandler;
    draft.removeEventHandler = removeEventHandler;
  });
}
