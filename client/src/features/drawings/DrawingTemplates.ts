import type {DrawingScene} from '../content/types';
export const drawingTemplateOptions=[
 {value:'blank',label:'空白画布'},{value:'deployment',label:'部署拓扑'},{value:'flow',label:'简单流程图'},
 {value:'sequence',label:'时序图'},{value:'swimlane',label:'泳道图'},{value:'er',label:'ER 图'},
 {value:'class',label:'UML 类图'},{value:'usecase',label:'UML 用例图'},{value:'state',label:'UML 状态图'},{value:'mobile',label:'手机线框（基础）'},
] as const;
export type DrawingTemplateKind=typeof drawingTemplateOptions[number]['value'];
type Point=[number,number];
const base={strokeColor:'#343a40',strokeWidth:1.5,roughness:0,fillStyle:'solid'};
function shape(type:'rectangle'|'ellipse'|'diamond',x:number,y:number,width:number,height:number,label='',style:Record<string,unknown>={}) {
 return {...base,id:crypto.randomUUID(),type,x,y,width,height,backgroundColor:'#ffffff',...(label?{label:{text:label,fontSize:18,fontFamily:2}}:{}),...style};
}
function text(value:string,x:number,y:number,fontSize=18) {return {...base,id:crypto.randomUUID(),type:'text',x,y,text:value,fontSize,fontFamily:2,lineHeight:1.5};}
function line(from:Point,to:Point,dashed=false) {return {...base,id:crypto.randomUUID(),type:'line',x:from[0],y:from[1],width:Math.abs(to[0]-from[0]),height:Math.abs(to[1]-from[1]),points:[[0,0],[to[0]-from[0],to[1]-from[1]]],strokeStyle:dashed?'dashed':'solid'};}
function arrow(from:Point,to:Point,label='',options:{start?:string;end?:string;dashed?:boolean;startArrowhead?:string|null;endArrowhead?:string|null;points?:Point[]}={}) {
 return {...line(from,to,options.dashed),type:'arrow',startArrowhead:options.startArrowhead??null,endArrowhead:options.endArrowhead===undefined?'arrow':options.endArrowhead,...(options.points?{points:options.points}:{}),...(label?{label:{text:label,fontSize:16,fontFamily:2}}:{}),...(options.start?{start:{id:options.start}}:{}),...(options.end?{end:{id:options.end}}:{})};
}
function table(name:string,sections:string[],x:number,y:number,width=260) {
 const heights=sections.map(section=>section.split('\n').length*27+28),height=56+heights.reduce((sum,value)=>sum+value,0),box=shape('rectangle',x,y,width,height),group=crypto.randomUUID();
 const nodes=[box,text(name,x+18,y+12,22),line([x,y+56],[x+width,y+56])];let top=y+56;
 for(const [index,section] of sections.entries()){nodes.push(text(section,x+18,top+12));top+=heights[index];if(index<sections.length-1) nodes.push(line([x,top],[x+width,top]));}
 return {box,nodes:nodes.map(node=>({...node,groupIds:[group]}))};
}
function deployment() {
 const gateway=shape('rectangle',40,160,140,90,'网关'),app=shape('rectangle',290,160,160,90,'应用服务器'),database=shape('rectangle',580,60,140,90,'数据库'),storage=shape('rectangle',580,290,140,90,'存储');
 return [gateway,app,database,storage,arrow([180,205],[290,205],'访问',{start:gateway.id,end:app.id}),arrow([450,190],[580,105],'读写',{start:app.id,end:database.id}),arrow([450,220],[580,335],'文件',{start:app.id,end:storage.id})];
}
function flow() {
 const start=shape('ellipse',40,180,100,60,'开始'),process=shape('rectangle',230,170,140,80,'处理'),check=shape('diamond',470,140,160,140,'验证'),end=shape('ellipse',760,180,110,60,'结束'),retry=shape('rectangle',480,400,140,70,'返工');
 return [start,process,check,end,retry,arrow([140,210],[230,210],'',{start:start.id,end:process.id}),arrow([370,210],[470,210],'',{start:process.id,end:check.id}),arrow([630,210],[760,210],'通过',{start:check.id,end:end.id}),arrow([550,280],[550,400],'未通过',{start:check.id,end:retry.id}),arrow([480,435],[300,250],'重新处理',{start:retry.id,end:process.id,points:[[0,0],[-180,0],[-180,-185]]})];
}
function sequence() {
 const centers=[120,380,640,900],names=['用户','Web 应用','API 服务','数据库'];
 const nodes=names.flatMap((name,index)=>[shape('rectangle',centers[index]-85,40,170,56,name),line([centers[index],96],[centers[index],710],true)]);
 nodes.push(shape('rectangle',373,150,14,490,'',{backgroundColor:'#e9ecef'}),shape('rectangle',633,230,14,330,'',{backgroundColor:'#e9ecef'}),shape('rectangle',893,310,14,90,'',{backgroundColor:'#e9ecef'}));
 const messages:[number,number,number,string,boolean][]=[[0,1,160,'1. 发起请求',false],[1,2,240,'2. 调用接口',false],[2,3,320,'3. 查询数据',false],[3,2,400,'4. 返回数据',true],[2,1,480,'5. 返回结果',true],[1,0,600,'6. 展示结果',true]];
 return [...nodes,...messages.map(([from,to,y,label,dashed])=>arrow([centers[from],y],[centers[to],y],label,{dashed})),text('实线：请求     虚线：返回',40,760,16)];
}
function swimlane() {
 const names=['申请人','审核人','系统'];
 const lanes=names.flatMap((name,index)=>[shape('rectangle',40,60+index*190,1060,190,'',{backgroundColor:'transparent'}),shape('rectangle',40,60+index*190,115,190,name,{backgroundColor:'#f1f3f5'})]);
 const submit=shape('rectangle',190,120,145,65,'提交申请'),review=shape('rectangle',385,310,145,65,'审核申请'),decision=shape('diamond',600,280,160,125,'审核通过？'),execute=shape('rectangle',835,500,145,65,'执行处理'),confirm=shape('rectangle',865,120,145,65,'确认结果'),revise=shape('rectangle',600,120,160,65,'补充材料');
 return [...lanes,submit,review,decision,execute,confirm,revise,arrow([335,153],[385,343],'',{start:submit.id,end:review.id,points:[[0,0],[25,0],[25,190],[50,190]]}),arrow([530,343],[600,343],'',{start:review.id,end:decision.id}),arrow([760,343],[908,500],'通过',{start:decision.id,end:execute.id,points:[[0,0],[148,0],[148,157]]}),arrow([680,280],[680,185],'退回',{start:decision.id,end:revise.id}),arrow([600,153],[458,310],'重新提交',{start:revise.id,end:review.id,points:[[0,0],[-142,0],[-142,157]]}),arrow([980,533],[1010,153],'通知',{start:execute.id,end:confirm.id,points:[[0,0],[65,0],[65,-380],[30,-380]]})];
}
function er() {
 const user=table('用户',['PK id: UUID\nname: string\nemail: string'],40,120),task=table('任务',['PK id: UUID\nFK project_id: UUID\nFK assignee_id: UUID\ntitle: string\nstatus: string'],460,120),project=table('项目',['PK id: UUID\nname: string\nstatus: string'],880,120);
 return [...user.nodes,...task.nodes,...project.nodes,arrow([300,240],[460,240],'负责',{start:user.box.id,end:task.box.id,startArrowhead:'crowfoot_one',endArrowhead:'crowfoot_many'}),arrow([project.box.x,project.box.y+project.box.height/2],[task.box.x+task.box.width,project.box.y+project.box.height/2],'包含',{start:project.box.id,end:task.box.id,startArrowhead:'crowfoot_one',endArrowhead:'crowfoot_many'}),text('关系：一个用户可负责多个任务；一个项目包含多个任务',40,500,16)];
}
function classDiagram() {
 const user=table('用户',['+id: UUID\n+name: string','+createOrder(): Order'],40,80),vip=table('VIP 用户',['+level: number','+getDiscount(): number'],40,520),order=table('订单',['+id: UUID\n+status: string','+submit(): void\n+cancel(): void'],470,80),item=table('订单项',['+quantity: number\n+unitPrice: number','+subtotal(): number'],900,80);
 return [...user.nodes,...vip.nodes,...order.nodes,...item.nodes,arrow([170,vip.box.y],[170,user.box.y+user.box.height],'继承',{start:vip.box.id,end:user.box.id,endArrowhead:'triangle_outline'}),arrow([300,220],[470,220],'创建',{start:user.box.id,end:order.box.id,endArrowhead:null}),arrow([730,220],[900,220],'组成',{start:order.box.id,end:item.box.id,startArrowhead:'diamond',endArrowhead:null}),text('1',320,185,16),text('0..*',410,185,16),text('1',755,185,16),text('1..*',830,185,16)];
}
function actor(name:string,x:number,y:number) {
 const group=crypto.randomUUID();return [shape('ellipse',x+21,y,38,38),line([x+40,y+38],[x+40,y+110]),line([x,y+62],[x+80,y+62]),line([x+40,y+110],[x+5,y+160]),line([x+40,y+110],[x+75,y+160]),text(name,x+10,y+175)].map(node=>({...node,groupIds:[group]}));
}
function usecase() {
 const boundary=shape('rectangle',240,50,650,580,'',{backgroundColor:'transparent'}),login=shape('ellipse',300,150,200,80,'登录系统'),manage=shape('ellipse',300,300,200,80,'管理任务'),progress=shape('ellipse',300,450,200,80,'查看进度'),permission=shape('ellipse',640,300,200,80,'维护权限');
 return [boundary,text('项目管理系统',455,75,24),...actor('用户',70,280),...actor('管理员',990,280),login,manage,progress,permission,line([150,342],[300,190]),line([150,342],[300,340]),line([150,342],[300,490]),line([990,342],[840,340]),line([990,342],[500,190]),arrow([400,300],[400,230],'«include»',{start:manage.id,end:login.id,dashed:true})];
}
function stateDiagram() {
 const initial=shape('ellipse',40,200,24,24,'',{backgroundColor:'#343a40'}),draft=shape('rectangle',150,170,145,85,'草稿',{roundness:{type:3}}),review=shape('rectangle',430,170,145,85,'审核中',{roundness:{type:3}}),published=shape('rectangle',750,170,145,85,'已发布',{roundness:{type:3}}),final=shape('ellipse',1030,194,36,36),dot=shape('ellipse',1038,202,20,20,'',{backgroundColor:'#343a40'});
 return [initial,draft,review,published,final,dot,arrow([64,212],[150,212],'',{start:initial.id,end:draft.id}),arrow([295,212],[430,212],'提交审核',{start:draft.id,end:review.id}),arrow([575,212],[750,212],'审核通过',{start:review.id,end:published.id}),arrow([895,212],[1030,212],'归档',{start:published.id,end:final.id}),arrow([503,255],[223,255],'退回修改',{start:review.id,end:draft.id,points:[[0,0],[0,150],[-280,150],[-280,0]]})];
}
function mobile() {
 const nodes=[shape('rectangle',100,40,360,760,'',{roundness:{type:3}}),text('9:41',120,54,14),shape('rectangle',226,50,110,16,'',{roundness:{type:3},backgroundColor:'#343a40'}),shape('rectangle',416,57,22,11),text('‹',120,94,30),text('页面标题',225,103,22),line([100,145],[460,145]),shape('rectangle',120,165,320,42,'搜索',{roundness:{type:3},backgroundColor:'#f1f3f5'}),shape('rectangle',120,230,320,155,'图片 / 内容区域',{backgroundColor:'#f1f3f5'}),line([120,230],[440,385]),line([440,230],[120,385])];
 for(let index=0;index<3;index++){const y=410+index*80;nodes.push(shape('rectangle',120,y,48,48,'',{backgroundColor:'#f1f3f5'}),text(`列表标题 ${index+1}`,184,y,18),text('描述文字',184,y+27,14),line([120,y+65],[440,y+65]));}
 nodes.push(line([100,700],[460,700]));for(const [index,name] of ['首页','项目','我的'].entries()){nodes.push(shape('ellipse',152+index*105,716,20,20),text(name,146+index*105,743,14));}
 nodes.push(line([225,785],[335,785]));return nodes;
}
const builders={deployment,flow,sequence,swimlane,er,class:classDiagram,usecase,state:stateDiagram,mobile};
export async function createDrawingTemplate(kind:DrawingTemplateKind):Promise<DrawingScene> {
 if(kind==='blank') return {formatVersion:1,elements:[],appState:{viewBackgroundColor:'#ffffff'},files:{}};
 const {convertToExcalidrawElements}=await import('@excalidraw/excalidraw');
 return {formatVersion:1,elements:convertToExcalidrawElements(builders[kind]() as any,{regenerateIds:false}).map(element=>({...element,y:element.y+80})),appState:{viewBackgroundColor:'#ffffff'},files:{}};
}
