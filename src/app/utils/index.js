import detectTimeWidth from './directives/detectTimeWidth';
import dropzone from './directives/dropzone';
import timeRefreshed from './directives/timeRefreshed';
import reloadState from './directives/reloadState';
import chunk from './factories/chunk';
import dateUtils from './factories/dateUtils';
import desktopNotifications from './factories/desktopNotifications';
import parseUrl from './factories/parseUrl';
import resurrecter from './factories/resurrecter';
import tools from './factories/tools';
import bytes from './filters/bytes';
import capitalize from './filters/capitalize';
import currency from './filters/currency';
import delay from './filters/delay';
import fixed from './filters/fixed';
import humanSize from './filters/humanSize';
import localReadableTime from './filters/localReadableTime';
import longReadableTime from './filters/longReadableTime';
import number from './filters/number';
import percentage from './filters/percentage';
import readableTime from './filters/readableTime';
import unicodeTagView from './filters/unicodeTagView';
import utcReadableTime from './filters/utcReadableTime';
import eventManager from './services/eventManager';
import hotkeys from './services/hotkeys';
import openStatePostMessage from './services/openStatePostMessage';
import strUtils from './services/strUtils';
import firstLoadState from './services/firstLoadState';
import lazyLoader from './services/lazyLoader';
import sanitize from './services/sanitize';

export default angular
    .module('proton.utils', ['proton.constants'])
    .service('lazyLoader', lazyLoader)
    .directive('detectTimeWidth', detectTimeWidth)
    .directive('dropzone', dropzone)
    .directive('timeRefreshed', timeRefreshed)
    .directive('reloadState', reloadState)
    .factory('chunk', chunk)
    .factory('dateUtils', dateUtils)
    .factory('desktopNotifications', desktopNotifications)
    .factory('firstLoadState', firstLoadState)
    .factory('parseUrl', parseUrl)
    .factory('resurrecter', resurrecter)
    .factory('tools', tools)
    .filter('bytes', bytes)
    .filter('capitalize', capitalize)
    .filter('currency', currency)
    .filter('delay', delay)
    .filter('fixed', fixed)
    .filter('humanSize', humanSize)
    .filter('localReadableTime', localReadableTime)
    .filter('longReadableTime', longReadableTime)
    .filter('number', number)
    .filter('percentage', percentage)
    .filter('readableTime', readableTime)
    .filter('unicodeTagView', unicodeTagView)
    .filter('utcReadableTime', utcReadableTime)
    .factory('eventManager', eventManager)
    .factory('hotkeys', hotkeys)
    .factory('openStatePostMessage', openStatePostMessage)
    .factory('strUtils', strUtils)
    .factory('sanitize', sanitize).name;
