var ADJECTIVES = [
  "Abrasive",
  "Brash",
  "Callous",
  "Daft",
  "Eccentric",
  "Fiesty",
  "Golden",
  "Holy",
  "Ignominious",
  "Joltin",
  "Killer",
  "Luscious",
  "Mushy",
  "Nasty",
  "OldSchool",
  "Pompous"
];

var FIRST_NAMES = [
  "Anna",
  "Bobby",
  "Cameron",
  "Danny",
  "Emmett",
  "Frida",
  "Gracie",
  "Hannah",
  "Isaac",
  "Jenova",
  "Kendra",
  "Lando",
  "Mufasa",
  "Nate",
  "Owen"
];

var LAST_NAMES = [
  "Anchorage",
  "Berlin",
  "Cucamonga",
  "Davenport",
  "Essex",
  "Fresno",
  "Gunsight",
  "Hanover",
  "Indianapolis",
  "Jamestown",
  "Kane",
  "Liberty"
];

function randomItem(array) {
  var randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

var randomName = () => {
  return (
    randomItem(ADJECTIVES) + randomItem(FIRST_NAMES) + randomItem(LAST_NAMES)
  );
};

// console.log(randomName());

$(function() {
  var speakerDevices = document.getElementById("speaker-devices");
  var ringtoneDevices = document.getElementById("ringtone-devices");
  var outputVolumeBar = document.getElementById("output-volume");
  var inputVolumeBar = document.getElementById("input-volume");
  var volumeIndicators = document.getElementById("volume-indicators");
  var device;
  // https://scarlet-hippopotamus-3934.twil.io/client-voice
  const demoServer = "http://localhost:9000/token";
  const mainServer = "http://localhost:4000/voice";
  const access = "http://localhost:9001/access";
  const doctor = "f4fb31d5-8a4c-4edf-98bd-cf24eb8c1441";
  // const doctor = "e9390c02-b185-4dde-a6a7-7bfe6873aff3";
  const patient = "bf22e5c6-2f5a-46a4-ae78-ccb9b1c3fe42";

  const room1 = "cf18ddda-0de7-4cfc-8d48-8c09c58d15ab";
  const room2 = "3b7df1a3-aa19-4cb1-a161-2a6eaab18bc5";
  const sessionId = "246dce27-c875-4bdb-a59b-58922d9fa82f";
  const sessionId2 = "52ae2f31-0983-4490-a1f6-9472383bea63";

  log("Requesting Capability Token...");
  axios
    .post(mainServer, {
      // identity: doctor,
      identity: patient,
      // room: room1,
      room: room2,
      // sessionId: sessionId
      sessionId: sessionId2
    })
    .then(function(result) {
      const data = result.data;
      log("Got a token.");
      console.log("Token token: " + data);

      // Setup Twilio.Device
      device = new Twilio.Device(data.token, {
        // Set Opus as our preferred codec. Opus generally performs better, requiring less bandwidth and
        // providing better audio quality in restrained network conditions. Opus will be default in 2.0.
        codecPreferences: ["opus", "pcmu"],
        // Use fake DTMF tones client-side. Real tones are still sent to the other end of the call,
        // but the client-side DTMF tones are fake. This prevents the local mic capturing the DTMF tone
        // a second time and sending the tone twice. This will be default in 2.0.
        fakeLocalDTMF: true,
        // Use `enableRingingState` to enable the device to emit the `ringing`
        // state. The TwiML backend also needs to have the attribute
        // `answerOnBridge` also set to true in the `Dial` verb. This option
        // changes the behavior of the SDK to consider a call `ringing` starting
        // from the connection to the TwiML backend to when the recipient of
        // the `Dial` verb answers.
        enableRingingState: true
      });

      device.on("ready", function(device) {
        log("Twilio.Device Ready!");
        document.getElementById("call-controls").style.display = "block";
      });

      device.on("error", function(error) {
        console.log(error);
        log("Twilio.Device Error: " + error.message);
      });

      device.on("connect", function(conn) {
        log("Successfully established call!");
        document.getElementById("button-call").style.display = "none";
        document.getElementById("button-hangup").style.display = "inline";
        volumeIndicators.style.display = "block";
        bindVolumeIndicators(conn);
      });

      device.on("disconnect", function(conn) {
        log("Call ended.");
        document.getElementById("button-call").style.display = "inline";
        document.getElementById("button-hangup").style.display = "none";
        volumeIndicators.style.display = "none";
      });

      device.on("incoming", function(conn) {
        log("Incoming connection from " + conn.parameters.From);
        var archEnemyPhoneNumber = "+18046813638";

        if (conn.parameters.From === archEnemyPhoneNumber) {
          conn.reject();
          log("It's your nemesis. Rejected call.");
        } else {
          // accept the incoming connection and start two-way audio
          conn.accept();
        }
      });

      console.log(data, "The data is here");

      setClientNameUI(data.identity);

      device.audio.on("deviceChange", updateAllDevices.bind(device));

      // Show audio selection UI if it is supported by the browser.
      if (device.audio.isOutputSelectionSupported) {
        document.getElementById("output-selection").style.display = "block";
      }
    })
    .catch(function(err) {
      console.log(err);
      log("Could not get a token from server!");
    });

  // Bind button to make call
  document.getElementById("button-call").onclick = function() {
    // get the phone number to connect the call to
    var params = {
      To: document.getElementById("phone-number").value
    };

    console.log("Calling " + params.To + "...");
    if (device) {
      var outgoingConnection = device.connect(params);
      outgoingConnection.on("ringing", function() {
        log("Ringing...");
      });
    }
  };

  // Bind button to hangup call
  document.getElementById("button-hangup").onclick = function() {
    log("Hanging up...");
    if (device) {
      device.disconnectAll();
    }
  };

  document.getElementById("get-devices").onclick = function() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(updateAllDevices.bind(device));
  };

  speakerDevices.addEventListener("change", function() {
    var selectedDevices = [].slice
      .call(speakerDevices.children)
      .filter(function(node) {
        return node.selected;
      })
      .map(function(node) {
        return node.getAttribute("data-id");
      });

    device.audio.speakerDevices.set(selectedDevices);
  });

  ringtoneDevices.addEventListener("change", function() {
    var selectedDevices = [].slice
      .call(ringtoneDevices.children)
      .filter(function(node) {
        return node.selected;
      })
      .map(function(node) {
        return node.getAttribute("data-id");
      });

    device.audio.ringtoneDevices.set(selectedDevices);
  });

  function bindVolumeIndicators(connection) {
    connection.on("volume", function(inputVolume, outputVolume) {
      var inputColor = "red";
      if (inputVolume < 0.5) {
        inputColor = "green";
      } else if (inputVolume < 0.75) {
        inputColor = "yellow";
      }

      inputVolumeBar.style.width = Math.floor(inputVolume * 300) + "px";
      inputVolumeBar.style.background = inputColor;

      var outputColor = "red";
      if (outputVolume < 0.5) {
        outputColor = "green";
      } else if (outputVolume < 0.75) {
        outputColor = "yellow";
      }

      outputVolumeBar.style.width = Math.floor(outputVolume * 300) + "px";
      outputVolumeBar.style.background = outputColor;
    });
  }

  function updateAllDevices() {
    updateDevices(speakerDevices, device.audio.speakerDevices.get());
    updateDevices(ringtoneDevices, device.audio.ringtoneDevices.get());

    // updateDevices(speakerDevices, );
    // updateDevices(ringtoneDevices, device);
  }

  // Update the available ringtone and speaker devices
  function updateDevices(selectEl, selectedDevices) {
    selectEl.innerHTML = "";

    device.audio.availableOutputDevices.forEach(function(device, id) {
      var isActive = selectedDevices.size === 0 && id === "default";
      selectedDevices.forEach(function(device) {
        if (device.deviceId === id) {
          isActive = true;
        }
      });

      var option = document.createElement("option");
      option.label = device.label;
      option.setAttribute("data-id", id);
      if (isActive) {
        option.setAttribute("selected", "selected");
      }
      selectEl.appendChild(option);
    });
  }

  // Activity log
  function log(message) {
    var logDiv = document.getElementById("log");
    logDiv.innerHTML += "<p>&gt;&nbsp;" + message + "</p>";
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  // Set the client name in the UI
  function setClientNameUI(clientName) {
    var div = document.getElementById("client-name");
    div.innerHTML = "Your client name: <strong>" + clientName + "</strong>";
  }
});

// console.log(randomName());
