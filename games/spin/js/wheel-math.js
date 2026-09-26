(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WheelMath=api;})(typeof window!=='undefined'?window:this,function(){
 const normal=x=>((x%360)+360)%360;
 function targetRotation(current,index,count,turns=7){if(!Number.isInteger(index)||index<0||index>=count||count<1)throw new Error('Segmen tidak valid.');const desired=normal(-(index+.5)*360/count);return current+turns*360+normal(desired-normal(current));}
 function pointerIndex(rotation,count){return Math.floor(normal(-rotation)/(360/count))%count;}
 return {normal,targetRotation,pointerIndex};
});
