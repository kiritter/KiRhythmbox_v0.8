/**
 * KiRhythmbox v0.8
 *
 * Copyright (c) 2013 kiritter
 *
 * Released under the MIT license
 *   https://github.com/kiritter/KiRhythmbox_v0.8/blob/master/LICENSE
 *   (http://opensource.org/licenses/MIT)
 *
 */

var kirhythmbox = (function() {
	"use strict";

	//--------------------------------------------------
	var MIN_NOTE = {
		QUARTER    : {NUM_PER_BAR: 4,  TIME_PER_BAR: function(bpm) {return (60/(bpm*1))*1000;}}
		, EIGHTH   : {NUM_PER_BAR: 8,  TIME_PER_BAR: function(bpm) {return (60/(bpm*2))*1000;}}
		, SIXTEENTH: {NUM_PER_BAR: 16, TIME_PER_BAR: function(bpm) {return (60/(bpm*4))*1000;}}
	};
	var MN = {
		LEN: 0
		, NOTE_TIME: 0
		, BAR_TIME: 0
	};
	var enableAssertion = true;
	var conf = null;
	var resumeInfo = {
		startDateTime: 0
		, playTotalTime: 0
		, isEOF: false
		, resumeDelayTime: 0
		, resume2ndBarDelayTime: 0
		, resumeBarIndex: 0
		, resumeNoteIndex: 0
	};
	var REST_FUNCNAME = "rest";
	var CONST_MODE = {
		PAUSE_MESSAGE: 1
		, STOP_MESSAGE: 2
		, STOP_PLAYING: 3
	};
	var CONST_STATUS = {
		STOP: 0
		, PAUSE: 1
		, PLAYING: 2
	};
	var status = CONST_STATUS.STOP;
	var playTimerId = null;
	var resumeTimerId = null;
	var barTimerId = null;
	var noteTimerId = [];

	//--------------------------------------------------
	var CONST = {
		QUARTER: 4
		, EIGHTH: 8
		, SIXTEENTH: 16
	};

	//--------------------------------------------------
	var getNowMsec = function() {
		var msec = new Date().getTime();
		return msec;
	};
	var isNumber = function(a) {
		var ret = false;
		if (typeof a === "number") {
			if (isFinite(a)) {
				ret = true;
			}
		}
		return ret;
	};
	var isNaturalNumber = function(a) {
		var ret = false;
		if (isNumber(a)) {
			var s = String(a);
			var retExp = (/[^0-9]/g).test(s);
			if (retExp === false) {
				ret = true;
			}
		}
		return ret;
	};
	var validateDelayTime = function(mode, delayTime) {
		var prefix = "";
		if (mode === "assertConfig") {
			prefix = "conf.";
		}
		var ret = {
			isNormal: false
			, errorMsg: ""
		};
		if (isNumber(delayTime)) {
			if (isNaturalNumber(delayTime) && (delayTime >= 0 && delayTime <= 9999)) {
				ret.isNormal = true;
			}else{
				ret.errorMsg = "'" + prefix + "delayTime' must be '>= 0 and <= 9999' and a natural number.";
			}
		}else{
			ret.errorMsg = "'" + prefix + "delayTime' must be a number.";
		}
		return ret;
	};
	var existsVariable = function(a) {
		var ret = false;
		if (typeof a !== "undefined") {
			ret = true;
		}
		return ret;
	};
	var assertConfig = function(conf) {
		if (!conf) {
			throw new Error("The argument of setConfig(), 'conf' is invalid.");
		}
		if (isNumber(conf.bpm) === false) {
			throw new Error("'conf.bpm' must be a number.");
		}
		if ((conf.bpm >= 1 && conf.bpm <= 240) === false) {
			throw new Error("'conf.bpm' must be >= 1 and <= 240.");
		}

		if (isNumber(conf.minNote) === false) {
			throw new Error("'conf.minNote' must be kirhythmbox.QUARTER, EIGHTH or SIXTEENTH.");
		}
		var numPerBar;
		switch (conf.minNote) {
			case CONST.QUARTER:
				numPerBar = MIN_NOTE.QUARTER.NUM_PER_BAR;
				break;
			case CONST.EIGHTH:
				numPerBar = MIN_NOTE.EIGHTH.NUM_PER_BAR;
				break;
			case CONST.SIXTEENTH:
				numPerBar = MIN_NOTE.SIXTEENTH.NUM_PER_BAR;
				break;
			default:
				throw new Error("'conf.minNote' must be kirhythmbox.QUARTER, EIGHTH or SIXTEENTH.");
		}

		if (existsVariable(conf.delayTime)) {
			var retObj = validateDelayTime("assertConfig", conf.delayTime);
			if (retObj.isNormal === false) {
				throw new Error(retObj.errorMsg);
			}
		}
		if (!conf.score) {
			throw new Error("'conf.score' is invalid.");
		}
		var errorMsg = assertScore(conf.score, numPerBar);
		if (errorMsg !== "") {
			throw new Error("'conf.score' is invalid. " + errorMsg);
		}

		if (existsVariable(conf.opt_callback)) {
			if (typeof conf.opt_callback !== "function") {
				throw new Error("'conf.opt_callback' must be a function.");
			}
		}
	};
	var assertScore = function(score, numPerBar) {
		var errorMsg = "";

		if (typeof Array.isArray === 'undefined') {
			Array.isArray = function(obj) {
				return Object.prototype.toString.call(obj) === '[object Array]';
			};
		};
		if (Array.isArray(score) === false) {
			errorMsg = "'conf.score' must be a array.";
			return errorMsg;
		}

		var len = score.length;
		if (len === 0) {
			errorMsg = "'conf.score' must contain at least one bar.";
			return errorMsg;
		}

		for (var i = 0; i < len; i++) {
			var bar = score[i];
			if (typeof bar !== "object") {
				errorMsg = "" + (i+1) + "th bar(score[" + i + "]) must be a valid object.";
				return errorMsg;
			}
			if (Array.isArray(bar)) {
				errorMsg = "" + (i+1) + "th bar(score[" + i + "]) must be a valid object.";
				return errorMsg;
			}
			var trNmAryTmp = [];
			for (var trNmTmp in bar) {
				if (bar.hasOwnProperty(trNmTmp)) {
					trNmAryTmp.push(trNmTmp);
				}
			}
			var trNmAryTmpLen = trNmAryTmp.length;
			if (trNmAryTmpLen === 0) {
				errorMsg = "" + (i+1) + "th bar(score[" + i + "]) must contain at least one track.";
				return errorMsg;
			}

			for (var trNm in bar) {
				if (bar.hasOwnProperty(trNm)) {
					var tr = bar[trNm];
					if (Array.isArray(tr) === false) {
						errorMsg = "" + (i+1) + "th bar(score[" + i + "]), track(" + trNm + ") must be a array.";
						return errorMsg;
					}
					var tlen = tr.length;
					if (tlen !== numPerBar) {
						errorMsg = "" + (i+1) + "th bar(score[" + i + "]), track(" + trNm + ").length is invalid. (actual:" + tr.length + ", expected:" + numPerBar + ")";
						return errorMsg;
					}
					for (var j = 0; j < tlen; j++) {
						if (typeof tr[j] !== "function" && typeof tr[j] !== "object") {
							errorMsg = "" + (i+1) + "th bar(score[" + i + "]), track(" + trNm + "), " + (j+1) + "th note(" + trNm + "[" + j + "]) must be a function or valid object.";
							return errorMsg;
						}
						if (typeof tr[j] === "object") {
							if (tr[j].hasOwnProperty("func") === false || tr[j].hasOwnProperty("count") === false || tr[j].hasOwnProperty("opts") === false) {
								errorMsg = "" + (i+1) + "th bar(score[" + i + "]), track(" + trNm + "), " + (j+1) + "th note(" + trNm + "[" + j + "]) must have properties 'func', 'count', 'opts'.";
								return errorMsg;
							}
						}
					}
				}
			}
		}
		return errorMsg;
	};
	var assertPlay = function(delayTime) {
		if (!conf) {
			throw new Error("The argument of setConfig(), 'conf' is invalid. First, setConfig() is required.");
		}
		if (existsVariable(delayTime)) {
			var retObj = validateDelayTime("assertPlay", delayTime);
			if (retObj.isNormal === false) {
				throw new Error(retObj.errorMsg);
			}
		}else{
			if (existsVariable(conf.delayTime) === false) {
				throw new Error("'delayTime' is required. (Arguments of setConfig() or play() must contain it.)");
			}
		}
	};
	var terminate = function(mode) {
		switch (mode) {
			case CONST_MODE.PAUSE_MESSAGE:
				stopTimers();
				status = CONST_STATUS.PAUSE;
				break;
			case CONST_MODE.STOP_MESSAGE:
				resumeInfoClear();
				stopTimers();
				status = CONST_STATUS.STOP;
				break;
			case CONST_MODE.STOP_PLAYING:
				resumeInfoClear();
				stopTimers();
				status = CONST_STATUS.STOP;
				if (existsVariable(conf.opt_callback)) {
					conf.opt_callback();
				}
				break;
		}
	};
	var resumeInfoClear = function() {
		resumeInfo.playTotalTime = 0;
		resumeInfo.isEOF = false;
	};
	var stopTimers = function() {
		stopPlayTimerId();
		stopResumeTimerId();
		stopBarTimerId();
		stopNoteTimerIdAll();
	};
	var stopPlayTimerId = function() {
		if (playTimerId !== null) {
			clearTimeout(playTimerId);
			playTimerId = null;
		}
	};
	var stopResumeTimerId = function() {
		if (resumeTimerId !== null) {
			clearTimeout(resumeTimerId);
			resumeTimerId = null;
		}
	};
	var stopBarTimerId = function() {
		if (barTimerId !== null) {
			clearInterval(barTimerId);
			barTimerId = null;
		}
	};
	var stopNoteTimerIdAll = function() {
		var len = noteTimerId.length;
		for (var i = 0; i < len; i++) {
			stopNoteTimerId(i);
		}
		noteTimerId = [];
	};
	var stopNoteTimerId = function(i) {
		if (noteTimerId.length !== 0 && (noteTimerId[i]) && noteTimerId[i] !== null) {
			clearInterval(noteTimerId[i]);
			noteTimerId[i] = null;
		}
	};
	var calculateForResume = function(interval) {
		var totalTime = resumeInfo.playTotalTime;
		totalTime += interval;

		var resumeBarIndex = Math.floor(totalTime / MN.BAR_TIME);
		var resumeNoteIndex = Math.floor( (totalTime % MN.BAR_TIME) / MN.NOTE_TIME ) + 1;

		if(resumeNoteIndex >= MN.LEN) {
			if((resumeBarIndex + 1) === conf.score.length) {
				resumeInfo.isEOF = true;
			}else{
				resumeBarIndex += 1;
				resumeNoteIndex = 0;
			}
		}

		resumeInfo.resumeBarIndex = resumeBarIndex;
		resumeInfo.resumeNoteIndex = resumeNoteIndex;
		resumeInfo.resumeDelayTime = MN.NOTE_TIME - ( (totalTime % MN.BAR_TIME) % MN.NOTE_TIME );
		totalTime += resumeInfo.resumeDelayTime;
		resumeInfo.playTotalTime = totalTime;

		resumeInfo.resume2ndBarDelayTime = MN.NOTE_TIME * (MN.LEN - resumeNoteIndex) + resumeInfo.resumeDelayTime;
	};
	//--------------------------------------------------
	var setConfig = function(argConf) {
		conf = argConf;

		var bpm = argConf.bpm;
		var minNote = argConf.minNote;

		MN.BAR_TIME = (60/bpm)*4*1000;

		switch (minNote) {
			case CONST.QUARTER:
				MN.LEN = MIN_NOTE.QUARTER.NUM_PER_BAR;
				MN.NOTE_TIME = MIN_NOTE.QUARTER.TIME_PER_BAR(bpm);
				break;
			case CONST.EIGHTH:
				MN.LEN = MIN_NOTE.EIGHTH.NUM_PER_BAR;
				MN.NOTE_TIME = MIN_NOTE.EIGHTH.TIME_PER_BAR(bpm);
				break;
			case CONST.SIXTEENTH:
				MN.LEN = MIN_NOTE.SIXTEENTH.NUM_PER_BAR;
				MN.NOTE_TIME = MIN_NOTE.SIXTEENTH.TIME_PER_BAR(bpm);
				break;
		}
	};
	var prePlay = function() {
		var oldStatus = status;
		status = CONST_STATUS.PLAYING;

		var delayTime = 0;
		var resumeBarIndex = 0;
		var resumeNoteIndex = 0;
		switch (oldStatus) {
			case CONST_STATUS.STOP:
				delayTime = conf.delayTime;
				break;
			case CONST_STATUS.PAUSE:
				delayTime = resumeInfo.resumeDelayTime;
				resumeBarIndex = resumeInfo.resumeBarIndex;
				resumeNoteIndex = resumeInfo.resumeNoteIndex;
				break;
		}

		if (delayTime === 0) {
			play(resumeBarIndex, resumeNoteIndex);

		}else{
			playTimerId = setTimeout(function() {
				play(resumeBarIndex, resumeNoteIndex);

				clearTimeout(playTimerId);
				playTimerId = null;
			}, Math.floor(delayTime));
		}
	};

	var play = function(resumeBarIndex, resumeNoteIndex) {
		if (resumeInfo.isEOF === true) {
			terminate(CONST_MODE.STOP_PLAYING);
			return;
		}

		resumeInfo.startDateTime = (new Date()).getTime();

		var score = conf.score;
		var len = score.length;

		var barIndex = resumeBarIndex;
		var barFunc = function() {
			var bar = score[barIndex];

			var trNmAry = [];
			for (var trNm in bar) {
				if (bar.hasOwnProperty(trNm)) {
					trNmAry.push(trNm);
				}
			}
			var trNmAryLen = trNmAry.length;
			var noteIndex = resumeNoteIndex;
			var noteFunc = function() {
				for (var trIndex = 0; trIndex < trNmAryLen; trIndex++) {
					var note = bar[trNmAry[trIndex]][noteIndex];
					if (typeof note === "function") {
						note();

					}else{
						note.func(note.count * MN.NOTE_TIME, note.opts);
					}
				}
			};

			noteFunc();
			noteIndex++;

			var f = (function(x) {
				return function() {
					if (noteIndex >= MN.LEN) {
						stopNoteTimerId(x);
						noteIndex = 0;
						return;
					}
					noteFunc();
					noteIndex++;
				};
			})(barIndex);
			noteTimerId[barIndex] = setInterval(f, Math.floor(MN.NOTE_TIME));
		};

		var barInterval = function() {
			barTimerId = setInterval(function() {
				//------------------------------
				if (barIndex >= len) {
					terminate(CONST_MODE.STOP_PLAYING);
					return;
				}
				barFunc();
				barIndex++;
				//------------------------------
			}, Math.floor(MN.BAR_TIME));
		};

		barFunc();
		barIndex++;

		if (resumeBarIndex === 0 && resumeNoteIndex === 0) {
			barInterval();

		}else{
			resumeNoteIndex = 0;
			resumeTimerId = setTimeout(function() {
				//------------------------------
				if (barIndex >= len) {
					terminate(CONST_MODE.STOP_PLAYING);
					return;
				}
				barFunc();
				barIndex++;
				//------------------------------
				barInterval();

				stopResumeTimerId();

			}, Math.floor(resumeInfo.resume2ndBarDelayTime));
		}
	};

	return {
		QUARTER: CONST.QUARTER
		, EIGHTH: CONST.EIGHTH
		, SIXTEENTH: CONST.SIXTEENTH

		, STOP: CONST_STATUS.STOP
		, PAUSE: CONST_STATUS.PAUSE
		, PLAYING: CONST_STATUS.PLAYING

		, setDisableAssertion: function() {
			enableAssertion = false;
		}
		, setEnableAssertion: function() {
			enableAssertion = true;
		}

		, setConfig: function(conf) {
			if (enableAssertion) {
				assertConfig(conf);
			}

			setConfig(conf);
		}

		, play: function(argDelayTime) {
			if (status === CONST_STATUS.PLAYING) {
				return false;
			}

			if (enableAssertion) {
				assertPlay(argDelayTime);
			}

			if (existsVariable(argDelayTime)) {
				conf.delayTime = argDelayTime;
			}

			prePlay();

			return true;
		}

		, getStatus: function() {
			return status;
		}

		, pause: function() {
			if (status === CONST_STATUS.PAUSE || status === CONST_STATUS.STOP) {
				return false;
			}

			var pauseDateTime = (new Date()).getTime();
			var interval = pauseDateTime - resumeInfo.startDateTime;

			terminate(CONST_MODE.PAUSE_MESSAGE);
			calculateForResume(interval);

			return true;
		}

		, stop: function() {
			if (status === CONST_STATUS.STOP) {
				return false;
			}

			terminate(CONST_MODE.STOP_MESSAGE);

			return true;
		}
	};
})();
