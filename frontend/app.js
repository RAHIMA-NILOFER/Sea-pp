"use strict";

/*
============================================================
 SEAFLOOR INTELLIGENCE
 ESP32 -> FastAPI -> FRONTEND
 REAL HARDWARE TELEMETRY
============================================================
*/

let missionSeconds = 0;
let scanCount = 0;
let latestData = null;


/* ============================================================
   HELPER
============================================================ */

function $(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    /* The dashboard HTML uses kebab-case IDs; retain these aliases so
       optional/legacy dashboard widgets cannot stop live telemetry. */
    const aliases = {
        depthValue: ["depth-value"],
        temperatureValue: ["temperature-value"],
        magneticValue: ["magnetic-value"],
        emValue: ["em-value"],
        xValue: ["probe-x", "survey-x"],
        yValue: ["probe-y", "survey-y"],
        latValue: ["latitude", "survey-lat"],
        lonValue: ["longitude", "survey-lon"],
        satelliteValue: ["satellites"],
        anomalyScore: ["anomaly-value"],
        anomalyIndex: ["anomaly-bar-value", "analysis-score"],
        classification: ["classification-value", "analysis-classification"],
        confidenceText: ["confidence-value", "analysis-confidence"],
        magneticDeviation: ["magnetic-score"],
        emDeviation: ["em-score"],
        targetX: ["next-x"],
        targetY: ["next-y"],
        informationGain: ["information-gain"],
        connectionText: ["system-connection"],
        hardwareStatus: ["hardware-status"],
        systemStatus: ["health-source"],
        connectionStatus: ["hardware-port-status"],
    };
    const ids = aliases[id] || [id];
    ids.forEach(function(target) {
        const element = $(target);
        if (element) element.textContent = value;
    });
}


function formatNumber(value, digits = 2) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "--";
    }

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "--";
    }

    return n.toFixed(digits);
}


/* ============================================================
   UPDATE HARDWARE STATUS
============================================================ */

function updateHardwareStatus(data) {

    if (!data) {
        return;
    }

    const realHardware =
        data.hardware_connected === true &&
        (
            data.hardware_available === true ||
            data.data_source === "REAL HARDWARE"
        );

    console.log(
        "HARDWARE:",
        realHardware ? "REAL HARDWARE" : "SIMULATION"
    );


    /*
    ------------------------------------------------------------
    TOP MODE BADGE
    ------------------------------------------------------------
    */

    const possibleStatusIds = [
        "connectionText",
        "hardwareStatus",
        "systemStatus",
        "connectionStatus",
        "mode",
        "system-connection",
        "health-source",
        "hardware-status",
        "hardware-source",
        "hardware-port-status"
    ];

    possibleStatusIds.forEach(function(id) {

        const element = $(id);

        if (!element) {
            return;
        }

        element.textContent =
            realHardware
                ? "REAL HARDWARE"
                : "SIMULATION MODE";

        if (realHardware) {

            element.classList.remove(
                "simulation",
                "offline"
            );

            element.classList.add(
                "hardware-connected"
            );

        } else {

            element.classList.remove(
                "hardware-connected"
            );

            element.classList.add(
                "simulation"
            );
        }
    });


    /*
    ------------------------------------------------------------
    CHANGE VISIBLE SIMULATION TEXT
    ------------------------------------------------------------
    */

    document
        .querySelectorAll("body *")
        .forEach(function(element) {

            if (
                element.children.length !== 0
            ) {
                return;
            }

            const text =
                element.textContent
                    .trim()
                    .toUpperCase();

            if (
                text === "SIMULATION MODE" ||
                text === "SIMULATION"
            ) {

                element.textContent =
                    realHardware
                        ? "REAL HARDWARE"
                        : "SIMULATION MODE";
            }
        });
}


/* ============================================================
   SENSOR STATUS
============================================================ */

function updateSensorStatus(data) {

    if (!data) {
        return;
    }

    const status =
        data.sensor_status || {};


    setText(
        "temperatureStatus",
        status.temperature === "AVAILABLE"
            ? "AVAILABLE"
            : "NOT AVAILABLE"
    );


    setText(
        "magneticStatus",
        status.magnetic === "AVAILABLE"
            ? "AVAILABLE"
            : "NOT AVAILABLE"
    );


    setText(
        "emStatus",
        status.em === "AVAILABLE"
            ? "AVAILABLE"
            : "NOT AVAILABLE"
    );


    setText(
        "depthStatus",
        status.depth === "AVAILABLE"
            ? "AVAILABLE"
            : "NOT AVAILABLE"
    );


    setText(
        "gpsStatus",
        status.gps === "AVAILABLE"
            ? "AVAILABLE"
            : "NOT AVAILABLE"
    );
}


/* ============================================================
   UPDATE MAIN SENSOR VALUES
============================================================ */

function updateTelemetry(data) {

    if (!data) {
        console.warn("No telemetry data received");
        return;
    }

    latestData = data;

    console.log(
        "ESP32 -> FASTAPI -> FRONTEND",
        data
    );


    /*
    ------------------------------------------------------------
    SENSOR VALUES
    ------------------------------------------------------------
    */

    const depth =
        data.depth;

    const temperature =
        data.temperature;

    const magnetic =
        data.magnetic;

    const em =
        data.em;


    /*
    ------------------------------------------------------------
    MAIN SENSOR CARDS
    ------------------------------------------------------------
    */

    // Render the API value verbatim, including -1 reported by the ESP32 for
    // an unavailable depth sensor.  Status is shown separately.
    setText("depthValue", formatNumber(depth, 2));


    /*
    Temperature
    */

    setText(
        "temperatureValue",
        formatNumber(temperature, 2)
    );


    /*
    Magnetic
    */

    setText(
        "magneticValue",
        formatNumber(magnetic, 2)
    );


    /*
    EM
    */

    setText(
        "emValue",
        formatNumber(em, 3)
    );

    const metalDetected = data.inductive === true;
    setText(
        "inductive-value",
        metalDetected ? "METAL DETECTED" : "NO METAL"
    );

    const inductiveCard = $("inductive-card");
    const inductiveDot = $("inductive-dot");
    if (inductiveCard) {
        inductiveCard.classList.toggle("metal-detected", metalDetected);
    }
    if (inductiveDot) {
        inductiveDot.classList.toggle("metal-detected", metalDetected);
    }

    setText("sensor-depth-value", formatNumber(depth, 2) + " m");
    setText("sensor-temperature-value", formatNumber(temperature, 2) + " °C");
    setText("sensor-magnetic-value", formatNumber(magnetic, 2) + " µT");
    setText("sensor-em-value", formatNumber(em, 3));

    const updatedAt = Number(data.timestamp) * 1000;
    setText(
        "last-update",
        Number.isFinite(updatedAt)
            ? new Date(updatedAt).toLocaleTimeString()
            : "--"
    );


    /*
    ------------------------------------------------------------
    COORDINATES
    ------------------------------------------------------------
    */

    setText(
        "xValue",
        formatNumber(data.x ?? 0, 2)
    );

    setText(
        "yValue",
        formatNumber(data.y ?? 0, 2)
    );

    setText(
        "latValue",
        formatNumber(data.lat, 6)
    );

    setText(
        "lonValue",
        formatNumber(data.lon, 6)
    );

    setText(
        "satelliteValue",
        String(data.satellites ?? 0)
    );


    /*
    ------------------------------------------------------------
    BOTTOM TELEMETRY
    ------------------------------------------------------------
    */

    setText("bottomDepth", formatNumber(depth, 2) + " m");


    setText(
        "bottomTemperature",
        formatNumber(temperature, 2) + " °C"
    );


    setText(
        "bottomMagnetic",
        formatNumber(magnetic, 2) + " µT"
    );


    setText(
        "bottomEM",
        formatNumber(em, 3) + " V"
    );


    /*
    ------------------------------------------------------------
    ANOMALY
    ------------------------------------------------------------
    */

    if (
        data.anomaly_score !== null &&
        data.anomaly_score !== undefined
    ) {

        const score =
            Number(data.anomaly_score);

        setText(
            "anomalyScore",
            formatNumber(score, 1) + " %"
        );

        setText(
            "anomalyIndex",
            formatNumber(score, 1)
        );
    }


    /*
    ------------------------------------------------------------
    CLASSIFICATION
    ------------------------------------------------------------
    */

    if (data.classification) {

        setText(
            "classification",
            data.classification
        );
    }


    /*
    ------------------------------------------------------------
    CONFIDENCE
    ------------------------------------------------------------
    */

    if (
        data.confidence !== null &&
        data.confidence !== undefined
    ) {

        const confidence =
            Number(data.confidence);

        setText(
            "confidenceText",
            formatNumber(confidence, 1) + "%"
        );


        const confidenceBar =
            $("confidenceBar");

        if (confidenceBar) {

            confidenceBar.style.width =
                Math.max(
                    0,
                    Math.min(
                        100,
                        confidence
                    )
                ) + "%";
        }
    }


    /*
    ------------------------------------------------------------
    SENSOR SCORES
    ------------------------------------------------------------
    */

    if (
        data.magnetic_score !== null &&
        data.magnetic_score !== undefined
    ) {

        setText(
            "magneticDeviation",
            formatNumber(
                data.magnetic_score,
                1
            )
        );
    }


    if (
        data.em_score !== null &&
        data.em_score !== undefined
    ) {

        setText(
            "emDeviation",
            formatNumber(
                data.em_score,
                1
            )
        );
    }


    /*
    ------------------------------------------------------------
    NEXT SCAN
    ------------------------------------------------------------
    */

    if (data.next_scan) {

        if (
            data.next_scan.x !== undefined
        ) {

            setText(
                "targetX",
                formatNumber(
                    data.next_scan.x,
                    2
                )
            );
        }


        if (
            data.next_scan.y !== undefined
        ) {

            setText(
                "targetY",
                formatNumber(
                    data.next_scan.y,
                    2
                )
            );
        }


        if (
            data.next_scan.information_gain !== undefined
        ) {

            setText(
                "informationGain",
                formatNumber(
                    data.next_scan.information_gain,
                    1
                ) + "%"
            );
        }
    }


    /*
    ------------------------------------------------------------
    UPDATE HARDWARE/SENSOR STATUS
    ------------------------------------------------------------
    */

    updateHardwareStatus(data);

    updateSensorStatus(data);
}


/* ============================================================
   FETCH REAL DATA FROM FASTAPI
============================================================ */

async function fetchTelemetry() {

    try {

        console.log(
            "Fetching /api/reading..."
        );


        const response =
            await fetch(
                "/api/reading?ts=" +
                Date.now(),
                {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "API DATA:",
            data
        );


        updateTelemetry(data);


    } catch (error) {

        console.error(
            "Telemetry error:",
            error
        );


        /*
        Do NOT automatically replace
        real values with fake values.
        */

        const connectionText =
            $("connectionText");

        if (connectionText) {

            connectionText.textContent =
                "BACKEND OFFLINE";
        }
    }
}


/* ============================================================
   HARDWARE STATUS
============================================================ */

async function getHardwareData() {

    try {

        const response =
            await fetch(
                "/api/hardware?ts=" +
                Date.now(),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "HARDWARE STATUS:",
            data
        );


        /*
        /api/hardware uses slightly
        different field names.
        */

        const converted = {

            hardware_connected:
                data.connected === true,

            hardware_available:
                data.hardware === true,

            data_source:
                data.data_source,

            sensor_status:
                data.sensor_status,

            port: data.port,

            baudrate: data.baudrate,

            probe: data.probe
        };


        updateHardwareStatus(
            converted
        );

        updateSensorStatus(
            converted
        );


    } catch (error) {

        console.error(
            "Hardware status error:",
            error
        );
    }
}


/* ============================================================
   MISSION TIMER
============================================================ */

function updateTimer() {

    missionSeconds++;


    const hours =
        Math.floor(
            missionSeconds / 3600
        );


    const minutes =
        Math.floor(
            (missionSeconds % 3600) / 60
        );


    const seconds =
        missionSeconds % 60;


    const time =
        String(hours).padStart(2, "0") +
        ":" +
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");


    setText(
        "missionTimer",
        time
    );
}


/* ============================================================
   CLOCK
============================================================ */

function updateClock() {

    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }
        );


    const date =
        now.toLocaleDateString(
            [],
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );


    setText(
        "live-clock",
        time
    );

    setText(
        "live-date",
        date
    );


    setText(
        "systemClock",
        time
    );
}


/* ============================================================
   INITIALIZATION
============================================================ */

function initializeDashboard() {

    if (window.__seafloorDashboardInitialized) {
        return;
    }

    window.__seafloorDashboardInitialized = true;

    console.log(
        "========================================"
    );

    console.log(
        "SEAFLOOR INTELLIGENCE"
    );

    console.log(
        "REAL HARDWARE FRONTEND"
    );

    console.log(
        "ESP32 -> FASTAPI -> DASHBOARD"
    );

    console.log(
        "========================================"
    );


    /*
    ------------------------------------------------------------
    GET FIRST READING IMMEDIATELY
    ------------------------------------------------------------
    */

    fetchTelemetry();


    /*
    ------------------------------------------------------------
    REFRESH SENSOR DATA EVERY SECOND
    ------------------------------------------------------------
    */

    setInterval(
        fetchTelemetry,
        1000
    );


    /*
    ------------------------------------------------------------
    REFRESH HARDWARE STATUS
    ------------------------------------------------------------
    */

    getHardwareData();


    setInterval(
        getHardwareData,
        2000
    );


    /*
    ------------------------------------------------------------
    CLOCK
    ------------------------------------------------------------
    */

    updateClock();

    setInterval(
        updateClock,
        1000
    );


    /*
    ------------------------------------------------------------
    MISSION TIMER
    ------------------------------------------------------------
    */

    updateTimer();

    setInterval(
        updateTimer,
        1000
    );

    const refreshButton = $("refresh-data");

    if (refreshButton) {
        refreshButton.addEventListener("click", fetchTelemetry);
    }

    const connectButton = $("connect-hardware");

    if (connectButton) {
        connectButton.addEventListener("click", async function() {
            const portInput = $("hardware-port");
            const port = portInput && portInput.value.trim()
                ? portInput.value.trim()
                : "COM5";

            try {
                const response = await fetch(
                    "/api/hardware/connect?port=" + encodeURIComponent(port) + "&baudrate=115200",
                    { method: "POST", cache: "no-store" }
                );
                const result = await response.json();
                setText("hardware-message", result.message || "Connection request complete.");
                getHardwareData();
                fetchTelemetry();
            } catch (error) {
                setText("hardware-message", "Unable to connect to " + port + ".");
            }
        });
    }

    document.querySelectorAll(".nav-item[data-page]").forEach(function(button) {
        button.addEventListener("click", function() {
            const page = button.dataset.page;
            document.querySelectorAll(".page[data-page]").forEach(function(section) {
                section.classList.toggle("active", section.dataset.page === page);
            });
            document.querySelectorAll(".nav-item[data-page]").forEach(function(item) {
                item.classList.toggle("active", item === button);
            });
            setText("page-title", button.textContent.trim());
        });
    });
}


/* ============================================================
   START
============================================================ */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

} else {

    initializeDashboard();
}
