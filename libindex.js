function createLib (execlib, applib, jqueryelementslib, angular1elementslib) {
  'use strict';

  require('./elements/datatablecreator')(execlib, applib, jqueryelementslib, angular1elementslib);
  require('./modifiers/datatableautoappendrowcreator')(execlib, applib);

  return {};
}

module.exports = createLib;
