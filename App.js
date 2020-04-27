/**
 * App.js
 * Small landing page showing how an MQTT client can be used in a React Native app
 *
 * @author Andrew Roberts
 *
 * Learn how to get started with React Native here: https://reactnative.dev/docs/environment-setup
 * Learn why you need "node-libs-react-native" for MQTT here: https://github.com/parshap/node-libs-react-native
 * Learn how to get started with Solace PubSub+ and event-driven architecture here: https://www.solace.dev/
 */

// import "node-libs-react-native/globals"; // try commenting this out if you want to see why we need it
import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Button } from "react-native";
import { createMqttClient } from "./mqtt-client";
import { clientConfig } from "./mqtt-client-config";

export default function App() {
  const [mqttClient, setMqttClient] = useState(null);

  // useEffect with no dependencies, runs once on app start
  useEffect(() => {
    async function startMqttClient() {
      /**
       * configure and connect the app's MQTT client
       */

      // configure mqtt connection options
      let mqttClientConfig = {
        hostUrl: clientConfig.MQTT_HOST_URL,
        username: clientConfig.MQTT_USERNAME,
        password: clientConfig.MQTT_PASSWORD,
      };

      // initialize and connect mqtt client
      let mqttClient;
      try {
        mqttClient = createMqttClient(mqttClientConfig);
        console.log("=== MqttClient starting... === ");
        await mqttClient.connect();
      } catch (err) {
        console.error(err);
      }
      console.log("=== MqttClient ready to use. === ");

      setMqttClient(mqttClient);
    }

    startMqttClient().catch((error) => {
      throw error;
    });
  }, []);

  function publishHelloWorldEvent() {
    mqttClient.send(
      "ReactNative/World/Hello",
      JSON.stringify({ message: "Hello world" }),
      1 // qos 1
    );
  }

  return (
    <View style={styles.container}>
      <Text>Solace 💚's React Native</Text>
      <Button
        color="#02a68d"
        title="Send MQTT msg"
        onPress={publishHelloWorldEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});

//
//
