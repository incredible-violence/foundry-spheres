
// Import Modules
import { SpheresSheet } from "./config.js";

import { ItemPF } from "../../../systems/pf1/module/item/entity.js";
import { ActorSheetPF } from "../../../systems/pf1/module/actor/sheets/base.js";
import { ItemSheetPF } from "../../../systems/pf1/module/item/sheets/base.js";
import { ActorSheetPFCharacter } from "../../../systems/pf1/module/actor/sheets/character.js";
import { ActorSheetPFNPC } from "../../../systems/pf1/module/actor/sheets/npc.js";
import {
  convertWeight
} from "../../../systems/pf1/module/lib.js";

function injectIntoClass(classObj, functionName, prior, injection) {
  console.log(`SpheresSheet | Injecting into ${classObj.name}.${functionName}`);
  var funcText = classObj.prototype[functionName].toString();
  var insertionPoint = funcText.indexOf(prior) + prior.length;
  if (insertionPoint == -1) {
    console.log('SpheresSheet | Failed injection due to not finding prior');
    return;
  }
  var modifiedFunction = funcText.slice(0, insertionPoint) + injection + funcText.slice(insertionPoint);
  classObj.prototype[functionName] = eval('(function ' + modifiedFunction + ')');
}

Hooks.once('init', async function() { 
  console.log('foundry-spheres | Initializing spheres sheet');

  CONFIG.SpheresSheet = SpheresSheet;

  // // Add talent feat type
  CONFIG.PF1.featTypes['magicTalent'] = "SpheresSheet.FeatTypeMagicTalent";

  // Inject talents category into feats
  injectIntoClass(ActorSheetPF, '_prepareItems', '"feat-type": "classFeat" },\n      },',
    `\n      magicTalent: {
        label: game.i18n.localize("SpheresSheet.MagicTalentPlural"),
        items: [],
        canCreate: true,
        hasActions: true,
        dataset: { type: "feat", "type-name": game.i18n.localize("SpheresSheet.FeatTypeMagicTalent"), "feat-type": "magicTalent" },
      },`);

  injectIntoClass(ItemSheetPF, '_getItemProperties', 'props.push(labels.featType);\n',
    `      if ( item.data.featType == "magicTalent" && this.object.getFlag("foundry-spheres", "sphere")) {
        props.push(game.i18n.localize(this.object.getFlag("foundry-spheres", "sphere")));
      }\n`);

  hookRenderers();
});

function hookRenderers() {
  Hooks.on('renderActorSheet', (characterSheet, html, data) => {
    console.log('foundry-spheres | Inserting spheres column');
    const sphereHeader = $(`<div class="item-detail item-sphere"><span>${game.i18n.localize('SpheresSheet.Sphere')}</span></div>`);

    var featsGroups = html.find('.feats-group.flexcol');
    var wantedName = game.i18n.localize("SpheresSheet.MagicTalentPlural");
    for (var i = 0; i < featsGroups.length; i++) {
        if ($(featsGroups[i]).find('li.inventory-header h3').text() == wantedName) {
          var magicTalentsGroup = $(featsGroups[i]);
          magicTalentsGroup.find('li.inventory-header h3').after(sphereHeader);

          magicTalentsGroup.find('li.item').each((index, element) => {
            var talentId = $(element).data('item-id');
            var sphere = characterSheet.object.items.get(talentId).getFlag('foundry-spheres', 'sphere');
            if (!sphere) sphere = '';
            var sphereCol = $('<div class="item-detail item-sphere"><span>' + game.i18n.localize(sphere) + '</span></div>')
            $(element).find('div.item-name').after(sphereCol);
          });
        }
    }
  });

  Hooks.on('renderItemSheetPF', (itemSheet, html, data) => {
    if (itemSheet.object.data.data.featType === 'magicTalent') {
      var sphere = itemSheet.object.getFlag('foundry-spheres', 'sphere');
      if (!sphere) sphere = CONFIG.SpheresSheet.magicSpheres.equipment;
      const sphereDropdown = $(`<div class="form-group">
        <label>${game.i18n.localize('SpheresSheet.Sphere')}</label>
        <select name="data.sphere">
          ${Object.values(CONFIG.SpheresSheet.magicSpheres)
            .map(element => `<option value="${element}"${element == sphere ? ' selected' : ''}>${game.i18n.localize(element)}</option>`).join('\n')}
        </select>
      </div>`);
      html.find('div.tab.details > div:nth-child(2)').after(sphereDropdown);
    }
  });

  Hooks.on('updateOwnedItem', (actorSheet, item, change, diff, _id) => {
    if ('data' in change && 'sphere' in change.data) {
      actorSheet.items.get(change._id).setFlag('foundry-spheres', 'sphere', change.data.sphere);
    }
  });

  Hooks.on('updateItem', (item, change, diff, _id) => {
    if ('data' in change && 'sphere' in change.data) {
      item.setFlag('foundry-spheres', 'sphere', change.data.sphere);
    }
  });
}