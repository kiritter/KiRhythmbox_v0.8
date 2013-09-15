(function() {

init();

function init() {
	window.addEventListener("load", function() {

		editHtmlElements();

		try {
			loadAudio();
		}catch(e) {
			alert(e.message);
			return;
		}

		loadScore();

		document.getElementById("btnPlay").addEventListener("click", function(event) {
			onclickPlay(this);
		}, false);

		document.getElementById("btnStop").addEventListener("click", function(event) {
			onclickStop();
		}, false);

	}, false);
}

//--------------------------------------------------
var CONST = {
	BTN_VAL_PLAY: "PLAY"
	, BTN_VAL_PAUSE: "PAUSE"
	, BTN_VAL_STOP: "STOP"
};
function editHtmlElements() {
	document.getElementById("txtDelayTime").value = 1250;
	document.getElementById("btnPlay").value = CONST.BTN_VAL_PLAY;
	document.getElementById("btnStop").value = CONST.BTN_VAL_STOP;
}

function loadAudio() {
	var ua = window.navigator.userAgent;
	//Synkro - Acceptance
	var videoId = "_dNht9Zr0CE";
	var startTime = 28;
	var callback = function(e) {alert(e.message);};
	KIRIAPP.audioManager.init(ua, document, videoId, startTime, callback);
}

function loadScore() {
	var score = KIRIAPP.score.makeScore();

	var conf = {
		bpm : 85
		, smallestNote : kirhythmbox.SIXTEENTH
//		, delayTime : 1250
		, score : score
		, opt_callback : function() {
			onclickStop();
		}
	};
	kirhythmbox.setConfig(conf);
}

//--------------------------------------------------
function onclickPlay(el) {
	if (KIRIAPP.audioManager.isLoad() === false) {
		alert("まだ楽曲が読み込まれていません。");
		return;
	}
	var delayTime = document.getElementById("txtDelayTime").value;
	if (isNaturalNumber(delayTime)) {
		delayTime = parseInt(delayTime, 10);
	}else{
		alert("'delayTime' must be a number.");
		return;
	}

	if (el.value === CONST.BTN_VAL_PLAY) {
		playAudioAndVisual(delayTime);
		el.value = CONST.BTN_VAL_PAUSE;
	}else{
		pauseAudioAndVisual();
		el.value = CONST.BTN_VAL_PLAY;
	}
}

function onclickStop() {
	stopAudioAndVisual();
	document.getElementById("btnPlay").value = CONST.BTN_VAL_PLAY;
}

function isNaturalNumber(s) {
	var ret = (/[^0-9]/g).test(s);
	if (ret === false) {
		return true;
	}else{
		return false;
	}
}

//--------------------------------------------------
function playAudioAndVisual(delayTime) {
	KIRIAPP.audioManager.play();
	kirhythmbox.play(delayTime);
}
function pauseAudioAndVisual() {
	KIRIAPP.audioManager.pause();
	kirhythmbox.pause();
}
function stopAudioAndVisual() {
	KIRIAPP.audioManager.stop();
	kirhythmbox.stop();
}


})();
