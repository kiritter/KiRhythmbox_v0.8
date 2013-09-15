var onYouTubeIframeAPIReady;
var onYouTubePlayerReady;
var onYouTubePlayerStateChange;
var onYouTubePlayerError;

var KIRIAPP = KIRIAPP || {};

KIRIAPP.audioManager = (function() {
	var _isLoad = false;
	var _isPlaying = false;
	var _isPC = true;
	var _startTime = 0;
	var _ytplayer = null;
	var isPC = function() {
		var ua = window.navigator.userAgent.toLowerCase();
		if (ua.indexOf("iphone") > 0
			|| ua.indexOf("ipad") > 0
			|| ua.indexOf("ipod") > 0
			|| ua.indexOf("android") > 0) {
			return false;
		}else{
			return true;
		}
	};
	var _loadAPICode = function() {
		var tag = document.createElement('script');
		tag.src = "//www.youtube.com/iframe_api";
		var firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
	};
	var _initPlayer = function(youtubeVideoId, callback) {
		onYouTubeIframeAPIReady = function() {
			_ytplayer = new YT.Player(
				"divytplayer"
				, {
					width: "320"
					, height: "250"
					, videoId: youtubeVideoId
				}
			);
			_ytplayer.addEventListener("onReady", "onYouTubePlayerReady");
			_ytplayer.addEventListener("onStateChange", "onYouTubePlayerStateChange");
			_ytplayer.addEventListener("onError", "onYouTubePlayerError");
		};

		onYouTubePlayerReady = function(event) {
			if (_isPC) {
				_seekStartPoint();
			}
		};
		onYouTubePlayerStateChange = function(event) {
			var newState = event.data;
			if (newState === YT.PlayerState.PAUSED) {
				_isLoad = true;
			}
		};
		onYouTubePlayerError = function(event) {
			var errorCode = event.data;
			callback(new Error("YouTube動画の読み込みでエラーが発生しました。(ErrorCode : " + errorCode + ")"));
		};
	};
	var _seekStartPoint = function() {
		_ytplayer.mute();
		_ytplayer.seekTo(_startTime, true);
		_ytplayer.pauseVideo();
	};
	return {
		init: function(youtubeVideoId, startTime, callback) {
			_isPC = isPC();
			_startTime = startTime;
			_initPlayer(youtubeVideoId, callback);
			_loadAPICode();
		}
		, isLoad: function() {
			return _isLoad;
		}
		, isPlaying: function() {
			return _isPlaying;
		}
		, play: function() {
			_isPlaying = true;
			if (_ytplayer) {
				_ytplayer.unMute();
				_ytplayer.playVideo();
			}
		}
		, pause: function() {
			_isPlaying = false;
			_ytplayer.pauseVideo();
		}
		, stop: function() {
			_isLoad = false;
			_isPlaying = false;
			_seekStartPoint();
		}
	};
})();
