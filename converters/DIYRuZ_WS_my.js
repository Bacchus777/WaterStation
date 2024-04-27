const zigbeeHerdsmanConverters = require('zigbee-herdsman-converters');
const zigbeeHerdsmanUtils = require('zigbee-herdsman-converters/lib/utils');


const exposes = zigbeeHerdsmanConverters['exposes'] || require("zigbee-herdsman-converters/lib/exposes");
const ea = exposes.access;
const e = exposes.presets;
const fz = zigbeeHerdsmanConverters.fromZigbeeConverters || zigbeeHerdsmanConverters.fromZigbee;
const tz = zigbeeHerdsmanConverters.toZigbeeConverters || zigbeeHerdsmanConverters.toZigbee;

const ptvo_switch = (zigbeeHerdsmanConverters.findByModel)?zigbeeHerdsmanConverters.findByModel('ptvo.switch'):zigbeeHerdsmanConverters.findByDevice({modelID: 'ptvo.switch'});
fz.legacy = ptvo_switch.meta.tuyaThermostatPreset;
fz.ptvo_on_off = {
  cluster: 'genOnOff',
  type: ['attributeReport', 'readResponse'],
  convert: (model, msg, publish, options, meta) => {
      if (msg.data.hasOwnProperty('onOff')) {
          const channel = msg.endpoint.ID;
          const endpointName = `l${channel}`;
          const binaryEndpoint = model.meta && model.meta.binaryEndpoints && model.meta.binaryEndpoints[endpointName];
          const prefix = (binaryEndpoint) ? model.meta.binaryEndpoints[endpointName] : 'state';
          const property = `${prefix}_${endpointName}`;
	  if (binaryEndpoint) {
            return {[property]: msg.data['onOff'] === 1};
          }
          return {[property]: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
      }
  },
};


const switchTypesList = {
    'switch': 0x00,
    'single click': 0x01,
    'multi-click': 0x02,
    'reset to defaults': 0xff,
};

const switchActionsList = {
    on: 0x00,
    off: 0x01,
    toggle: 0x02,
};

const inputLinkList = {
    no: 0x00,
    yes: 0x01,
};

const bindCommandList = {
    'on/off': 0x00,
    'toggle': 0x01,
    'change level up': 0x02,
    'change level down': 0x03,
    'change level up with off': 0x04,
    'change level down with off': 0x05,
    'recall scene 0': 0x06,
    'recall scene 1': 0x07,
    'recall scene 2': 0x08,
    'recall scene 3': 0x09,
    'recall scene 4': 0x0A,
    'recall scene 5': 0x0B,
};

function getSortedList(source) {
    const keysSorted = [];
    for (const key in source) {
        keysSorted.push([key, source[key]]);
    }

    keysSorted.sort(function(a, b) {
        return a[1] - b[1];
    });

    const result = [];
    keysSorted.forEach((item) => {
        result.push(item[0]);
    });
    return result;
}

function getListValueByKey(source, value) {
    const intVal = parseInt(value, 10);
    return source.hasOwnProperty(value) ? source[value] : intVal;
}

const getKey = (object, value) => {
    for (const key in object) {
        if (object[key] == value) return key;
    }
};

tz.ptvo_on_off_config = {
    key: ['switch_type', 'switch_actions', 'link_to_output', 'bind_command'],
    convertGet: async (entity, key, meta) => {
        await entity.read('genOnOffSwitchCfg', ['switchType', 'switchActions', 0x4001, 0x4002]);
    },
    convertSet: async (entity, key, value, meta) => {
        let payload;
        let data;
        switch (key) {
        case 'switch_type':
            data = getListValueByKey(switchTypesList, value);
            payload = {switchType: data};
            break;
        case 'switch_actions':
            data = getListValueByKey(switchActionsList, value);
            payload = {switchActions: data};
            break;
        case 'link_to_output':
            data = getListValueByKey(inputLinkList, value);
            payload = {0x4001: {value: data, type: 32 /* uint8 */}};
            break;
        case 'bind_command':
            data = getListValueByKey(bindCommandList, value);
            payload = {0x4002: {value: data, type: 32 /* uint8 */}};
            break;
        }
        await entity.write('genOnOffSwitchCfg', payload);
    },
};

fz.ptvo_on_off_config = {
    cluster: 'genOnOffSwitchCfg',
    type: ['readResponse', 'attributeReport'],
    convert: (model, msg, publish, options, meta) => {
        const channel = getKey(model.endpoint(msg.device), msg.endpoint.ID);
        const {switchActions, switchType} = msg.data;
        const inputLink = msg.data[0x4001];
        const bindCommand = msg.data[0x4002];
        return {
            [`switch_type_${channel}`]: getKey(switchTypesList, switchType),
            [`switch_actions_${channel}`]: getKey(switchActionsList, switchActions),
            [`link_to_output_${channel}`]: getKey(inputLinkList, inputLink),
            [`bind_command_${channel}`]: getKey(bindCommandList, bindCommand),
        };
    },
};

function ptvo_on_off_config_exposes(epName) {
    const features = [];
    features.push(exposes.enum('switch_type', exposes.access.ALL,
        getSortedList(switchTypesList)).withEndpoint(epName));
    features.push(exposes.enum('switch_actions', exposes.access.ALL,
        getSortedList(switchActionsList)).withEndpoint(epName));
    features.push(exposes.enum('link_to_output', exposes.access.ALL,
        getSortedList(inputLinkList)).withEndpoint(epName));
    features.push(exposes.enum('bind_command', exposes.access.ALL,
        getSortedList(bindCommandList)).withEndpoint(epName));
    return features;
}




const device = {
    zigbeeModel: ['DIYRuZ_WS_my'],
    model: 'DIYRuZ_WS_my',
    vendor: 'modkam.ru',
    description: '[Configurable firmware](https://ptvo.info/zigbee-configurable-firmware-features/)',
    fromZigbee: [fz.ignore_basic_report, fz.ptvo_on_off, fz.ptvo_multistate_action, fz.legacy.ptvo_switch_buttons, fz.ptvo_on_off_config,],
    toZigbee: [tz.ptvo_switch_trigger, tz.on_off, tz.ptvo_on_off_config,],
    exposes: [e.switch().withEndpoint('l2'),
      e.switch().withEndpoint('l3'),
      e.switch().withEndpoint('l4'),
      e.switch().withEndpoint('l5'),
      e.switch().withEndpoint('l6'),
      e.water_leak().withEndpoint('l7'),
      e.contact().withEndpoint('l8'),
],
    meta: {
        multiEndpoint: true,
        binaryEndpoints: {'l7': 'water_leak', 'l8': 'contact', }, 
    },
    endpoint: (device) => {
        return {
            l2: 2, l3: 3, l4: 4, l5: 5, l6: 6, l7: 7, l8: 8, l1: 1,
        };
    },
    configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
      await endpoint.read('genBasic', ['modelId', 'swBuildId', 'powerSource']);
    },
    icon: 'data:image/png;base64,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',

};

module.exports = device;
