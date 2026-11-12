export const colors={blue:"#3b82f6",purple:"#8b72e8",teal:"#36aa91",amber:"#e8ad50",coral:"#e78a74",light:"#90b9f8",gray:"#dce2ea"};
export const tdsColors:Record<string,string>={"Approved":colors.blue,"Approved with comments":colors.light,"Under review":colors.amber,"Revise & resubmit":colors.coral,"In preparation":"#b7b3d4","Not started":colors.gray,"Rejected":"#ce6473","Not recorded":"#aeb8c7"};
export const stageColors=["#dce2ea","#a8c7f5","#95a8eb","#b4a2ed","#8b72e8","#5d8de6",colors.teal,"#aeb8c7"];
export const tdsNames=["Approved","Approved with comments","Under review","Revise & resubmit","Rejected","In preparation","Not started","Not recorded"];

export const tradeColors:Record<string,string>={HVAC:"#3b82f6",Electrical:"#a57adf",Plumbing:"#29a694",Firefighting:"#df8c65",Civil:"#d2a249",BMS:"#3ca4ca",ELV:"#6d83cb"};
export const tradeColor=(trade:string)=>tradeColors[trade]||colors.blue;
export const costColors:Record<string,string>={Procurement:colors.blue,Salaries:colors.purple,"Guest house":colors.teal,"Site running":colors.amber,Allowance:"#64a6cb","One-time setup":colors.coral,Subcontract:"#8994c8",Other:"#a3afbf"};
