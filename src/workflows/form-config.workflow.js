const formConfigService = require('../services/form-config.service');
module.exports = {
  get:  (hospitalId, formType)         => formConfigService.getConfig(hospitalId, formType),
  save: (hospitalId, formType, body)   => formConfigService.saveConfig(hospitalId, formType, body),
  list: (hospitalId)                   => formConfigService.listConfigs(hospitalId),
};
