// Définition d'une fonction anonyme qui prend la fenêtre comme argument
(function (w) {
    // Redéfinition de la classe URLSearchParams si elle n'existe pas déjà
    w.URLSearchParams = w.URLSearchParams || function (searchString) {
        // Définition d'une variable self pour faire référence à l'instance actuelle
        var self = this;
        // Stockage de la chaîne de recherche dans l'instance
        self.searchString = searchString;
        // Méthode get pour extraire des paramètres de la chaîne de recherche
        self.get = function (name) {
            // Utilisation d'une expression régulière pour extraire la valeur du paramètre
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(self.searchString);
            // Vérification si le paramètre existe
            if (results == null) {
                return null;
            } else {
                // Décodage de la valeur du paramètre et retour
                return decodeURI(results[1]) || 0;
            }
        };
    };
})(window);

// Définition d'une fonction status pour afficher un message dans un élément HTML avec l'id "status"
const status = function (message) {
    document.getElementById("status").innerText = message;
}

// Tableau associatif des langues avec leurs codes
var langs = {
    "en": "English",
    "fr": "French",
    "ja": "Japanese",
    "pl": "Polish",
    "pt": "Portuguese",
    "ro": "Romanian; Moldavian; Moldovan",
    "ru": "Russian",
    "tg": "Tajik",
    "th": "Thai",
    "uk": "Ukrainian",
    "za": "Zhuang; Chuang",
    "zh": "Chinese",
};






// Détermination de la langue par défaut en utilisant la langue du navigateur
var myLang = navigator.language || "en-US";

// Vérification de la présence du paramètre "lang" dans l'URL et récupération de la langue
if (urlParams.has("lang")) {
    myLang = urlParams.get("lang");
} else if (getStorage("myLang")) {
    myLang = getStorage("myLang");
} else {
    updateURL("lang=" + myLang);
}
// Extraction du code de langue à partir de la langue par défaut
var myLangCode = myLang.split("-")[0].toLowerCase();

// Code de langue cible par défaut
var targetCode = "de";
// Si la langue par défaut est l'allemand, la langue cible sera l'anglais
if (myLangCode == "de") {
    targetCode = "en";
}

// Vérification et récupération du code de langue cible depuis le stockage local
if (getStorage("targetCode")) {
    targetCode = getStorage("targetCode");
}

// Logique pour déterminer le code de langue cible en utilisant les paramètres de l'URL
if (urlParams.has("translate") || urlParams.has("target")) {
    targetCode = urlParams.get("translate") || urlParams.get("target") || targetCode;
    targetCode = targetCode.split("-")[0].toLowerCase();
} else if (getStorage("targetCode")) {
    targetCode = getStorage("targetCode");
} else {
    updateURL("translate=" + targetCode);
}

// Stockage du code de langue cible dans le stockage local avec une durée de vie élevée
setStorage("targetCode", targetCode, 999999);
setStorage("myLang", myLang, 999999);

// Déclaration d'une variable label (non utilisée dans ce script)

// Récupération des éléments HTML pour les langues source et cible
const langFrom = document.getElementById("lang-from");
const langTo = document.getElementById("lang-to");

// Objet pour stocker les langues disponibles
var availableLangs = {};

// Construction de l'URL pour récupérer la liste des langues
var langurl = "http://localhost:50559/languages";

// Requête GET pour obtenir la liste des langues
fetch(langurl, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
}).then((response) => response.json()).then((data) => {
    // Traitement des données de réponse
    var languages = data.data.languages;
    languages.forEach(l => {
        availableLangs[l.language] = langs[l.language] || l.language;

        // Création et ajout d'options aux listes déroulantes des langues source et cible
        var option = document.createElement("option");
        option.innerText = langs[l.language] || l.language;
        option.value = l.language;
        if (option.value == myLangCode) {
            option.selected = true;
        }
        langFrom.appendChild(option);

        option = document.createElement("option");
        option.innerText = langs[l.language] || l.language;
        option.value = l.language;
        if (option.value == targetCode) {
            option.selected = true;
        }
        langTo.appendChild(option);
    });
    setup(); // Configuration de la traduction
});

// Déclaration d'un compteur
var counter = 0;

// Fonction pour traduire le texte
function translate(textToTranslate) {
    if (!document.getElementById("enabledTranscription").checked) {
        return;
    }

    // Construction de l'URL pour la traduction
    var url = apiKey ? "http://localhost:50559/translate" + "&q=" + encodeURI(textToTranslate) + "&target=" + targetCode + "&source=" + myLangCode;

    // Requête GET pour la traduction
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    }).then((response) => response.json()).then((data) => {
        console.log(data);
        console.log(data.data.translations[0].translatedText);
        updateTrans(data.data.translations[0].translatedText)
    });
}

// Fonction pour mettre à jour le texte traduit
function updateTrans(data) {
    document.getElementById("output").innerHTML = data;
    var text = document.getElementById("output").textContent || "";
    counter += 1;
    // Envoi du texte traduit via un socket WebSocket
    if (label) {
        socket.send(JSON.stringify({
            "msg": true,
            "final": text,
            "id": counter,
            "label": label,
            "c": document.getElementById("fullContext").checked,
            "ln": targetCode
        }));
    } else {
        socket.send(JSON.stringify({
            "msg": true,
            "final": text,
            "id": counter,
            "c": document.getElementById("fullContext").checked,
            "ln": targetCode
        }));
    }
}

// Gestionnaire d'événement pour le changement de la langue source
langFrom.addEventListener("change", e => {
    myLangCode = e.target.value;
    // Mise à jour de la langue source dans l'URL et dans le stockage local
    if (myLang.split("-")[0].toLowerCase() !== myLangCode) {
        setStorage("myLang", myLangCode, 999999);
        updateURL("lang=" + myLangCode, true);
        recognition.onend = null;
        recognition.stop();
        recognition = null;
        setup();
    }
});

// Gestionnaire d'événement pour le changement de la langue cible
langTo.addEventListener("change", e => {
    targetCode = e.target.value;
    updateURL("translate=" + targetCode, true);
    setStorage("targetCode", targetCode, 999999);
});

// Fonction pour mettre à jour l'URL avec les paramètres spécifiés
function updateURL(param, force = false) {
    var para = param.split('=');
    if (!(urlParams.has(para[0].toLowerCase()))) {
        if (history.pushState) {
            var arr = window.location.href.split('?');
            var newurl;
            if (arr.length > 1 && arr[1] !== '') {
                newurl = window.location.href + '&' + param;
            } else {
                newurl = window.location.href + '?' + param;
            }
            window.history.pushState({path: newurl}, '', newurl);
        }
    } else if (force) {
        if (history.pushState) {
            var href = new URL(window.location.href);
            if (para.length == 1) {
                href.searchParams.set(para[0].toLowerCase(), "");
            } else {
                href.searchParams.set(para[0].toLowerCase(), para[1]);
            }
            window.history.pushState({path: href.toString()}, '', href.toString());
        }
    }
}

// Fonction pour générer un identifiant de flux
function generateStreamID() {
    var text = "";
    var possible = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    for (var i = 0; i < 7; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// Identifiant de la salle de discussion
var roomID = "test";
if (urlParams.has("room")) {
    roomID = urlParams.get("room");
} else if (urlParams.has("ROOM")) {
    roomID = urlParams.get("ROOM");
} else {
    roomID = generateStreamID();
    updateURL("room=" + roomID);
}

// Construction du lien de partage
var url = document.URL.substr(0, document.URL.lastIndexOf('/'));
document.getElementById("shareLink").href = url + "/overlay?room=" + roomID;
document.getElementById("shareLink").innerHTML = url + "/overlay?room=" + roomID;

// Copie automatique du lien de partage dans le presse-papiers
navigator.clipboard.writeText(url + "/overlay?room=" + roomID).then(() => {
    /* clipboard successfully set */
}, () => {
    /* clipboard write failed */
});

// Création d'une connexion WebSocket
var socket = new WebSocket("wss://api.caption.ninja:443");

// Gestionnaire d'événement pour la fermeture de la connexion WebSocket
socket.onclose = function () {
    setTimeout(function () {
        window.location.reload(true);
    }, 100);
};

// Gestionnaire d'événement pour l'ouverture de la connexion WebSocket
socket.onopen = function () {
    socket.send(JSON.stringify({"join": roomID}));
}

// Déclaration de variables pour la transcription
var final_transcript = '';
var last_transcription = "";
var second_transcription = "";
var idle = null;
var recognition = null;
var ends = 0;

// Fonction de configuration pour la reconnaissance vocale
function setup() {
    if ('webkitSpeechRecognition' in window) {
        console.log("Setting up webkitSpeechRecognition");
        recognition = new webkitSpeechRecognition();
        if (myLang && myLangCode) {
            if (myLang.split("-")[0] == myLangCode) {
                recognition.lang = myLang;
            } else {
                recognition.lang = myLangCode;
            }
        } else if (myLangCode) {
            recognition.lang = myLangCode;
        } else if (myLang) {
            recognition.lang = myLang;
        }
        recognition.continuous = true;
        recognition.interimResults = false;

        // Gestionnaires d'événements pour la reconnaissance vocale
        recognition.onstart = function () {
            console.log("started transcription");
            setTimeout(function () {
                ends = 0;
            }, 2000);
        };
        recognition.onerror = function (event) {
            console.error(event);
        };
        recognition.onend = function (e) {
            console.log(e);
            console.log("Stopped transcription");

            if (event.type === "end") {
                ends += 1;
            }
            if (ends > 3) {
                alert("WARNING: Cannot enable transcription service\n\nThe service will fail completely if more than one transcription session is currently active on your computer.\n\nPlease close other Caption.Ninja tabs or other transcription services and then wait a few minutes before retrying.");
            } else {
                recognition.start();
            }
        };
        recognition.onresult = function (event) {
            var interim_transcript = '';
            if (typeof (event.results) == 'undefined') {
                console.log(event);
                return;
            }

            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                }
            }

            if (final_transcript) {
                console.log("FINAL:", final_transcript);
                document.getElementById("input").value = final_transcript;
                if (document.getElementById("fullContext").checked) {
                    translate(second_transcription + last_transcription + final_transcript)
                } else {
                    translate(final_transcript);
                }
                second_transcription = last_transcription;
                last_transcription = final_transcript + ". ";
                final_transcript = "";
            }
        };

        // Démarrage de la reconnaissance vocale
        recognition.start();
    }
}
