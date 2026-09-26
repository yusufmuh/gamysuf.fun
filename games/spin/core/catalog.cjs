'use strict';
const folka=require('./folka.cjs');
const {ZONK}=require('./legacy-catalog.cjs');
function defaultState(){return {schema:2,inventoryVersion:5,campaignId:'pesta-folka-2026',revision:0,prizes:folka.prizes(),settings:{...folka.settings},history:[],audit:[],pending:null};}
module.exports={defaultPrizes:folka.prizes,defaultState,ZONK};
