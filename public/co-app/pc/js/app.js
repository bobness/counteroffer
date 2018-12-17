angular.module('pc', [
  'ngResource',
  'xeditable',
  'ui.bootstrap',
  'ngSanitize',
  'ngTagsInput',
  'ngDragToReorder'
]).run(function (editableOptions) {
   editableOptions.theme = 'bs3';
});