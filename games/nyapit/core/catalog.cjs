'use strict';
const rows=[
 ['powder-000','Pressed Powder 000','Pinkflash Lasting Matte Loose Pressed Powder - 000','PINKFLASH','000','powder-000.jpg'],
 ['foundation-04','Fluid Foundation 04','FOCALLURE FLUID FOUNDATION FA30 - 04 trial size','FOCALLURE','04 · trial size','foundation-04.jpg'],
 ['duo-m03','Duo Lipgloss M03','PINKFLASH DUO LIPGLOSS PF-L13 - M03','PINKFLASH','M03','duo.jpg'],
 ['salsa-vinilash','SALSA VINILASH','SALSA VINILASH','SALSA','','curler.jpg'],
 ['salsa-vinilash-pro','SALSA VINILASH Pro','SALSA VINILASH Pro','SALSA','Pro','vinilash-pro.jpg'],
 ['stick-hs03','Duo Makeup Stick','PINKFLASH DUO MAKEUP STICK PF-PF21 - HS03','PINKFLASH','HS03','stick.jpg'],
 ['creamy-or01','Creamy Lipgloss OR01','PINKFLASH CREAMY LIPGLOSS OR01','PINKFLASH','OR01','creamy-or01.jpg'],
 ['creamy-rd01','Creamy Lipgloss RD01','PINKFLASH CREAMY LIPGLOSS RD01','PINKFLASH','RD01','creamy-rd01.jpg'],
 ['foundation-03','Fluid Foundation 03','FOCALLURE FLUID FOUNDATION FA30 - 03 trial size','FOCALLURE','03 · trial size','foundation-03.jpg'],
 ['glossy-g03','Lasting Glossy G03','Pinkflash L02 Lasting Glossy Lipgloss - G03','PINKFLASH','G03','glossy-g03.jpg'],
 ['watery-nu02','Watery Lip Cream NU02','PINKFLASH WATERY TRANSFERPROOF LIP CREAM NU02','PINKFLASH','NU02','watery-nu02.jpg'],
 ['balm-pk01','Color Reviving Balm','PINKFLASH COLOR REVIVING LIP BALM PK01','PINKFLASH','PK01','balm-pk01.jpg']
];
const prize=(id,name,fullName,tier,stock,image,extra={})=>({id,name,fullName,tier,stock,initialStock:stock,image:`/assets/products/${image}`,enabled:true,imageChecked:['grand','voucher','newuser'].includes(tier),...extra});
function prizes(){return [
 prize('bundling','Mystery Bundling','Hadiah Utama · Bundling 2 pcs','bundling',2,'bundling.svg',{points:500,terms:'Isi paket misteri ditentukan petugas.'}),
 prize('voucher-500000','Voucher Rp500rb','Hadiah Utama · Voucher potongan Rp500.000','grand',1,'voucher-500000.svg',{points:400,minimum:750000,discount:500000,voucherCode:'BPFOLKA5OO',terms:'Kode: BPFOLKA5OO · Minimal belanja Rp750.000.'}),
 prize('voucher-25','Voucher 25%','Voucher potongan 25%','voucher',null,'voucher-25.svg',{points:100,minimum:25000,discount:25,voucherCode:'BPFOLKA25',terms:'Kode: BPFOLKA25 · Minimal belanja Rp25.000.'}),
 prize('voucher-50','Voucher 50%','Voucher potongan 50%','voucher',15,'voucher-50.svg',{points:120,minimum:50000,discount:50,voucherCode:'BPFOLKA50',terms:'Kode: BPFOLKA50 · Minimal belanja Rp50.000.'}),
 prize('voucher-100000','Voucher Rp100rb','Voucher potongan Rp100.000','voucher',15,'voucher-100000.svg',{points:150,minimum:150000,discount:100000,voucherCode:'BPFOLKA100',terms:'Kode: BPFOLKA100 · Minimal belanja Rp150.000.'}),
 ...rows.map(([id,name,fullName,brand,variant,image])=>prize(id,name,fullName,'product',15,image,{points:80,brand,variant,terms:'Hadiah produk gratis.'})),
 prize('voucher-newuser','Voucher Pengguna Baru','Voucher pengguna baru potongan Rp25.000','newuser',null,'voucher-newuser.svg',{points:40,minimum:40000,discount:25000,voucherCode:'BPEVN25',terms:'Kode: BPEVN25 · Khusus pengguna baru. Minimal belanja Rp40.000.'})
];}
const settings={eventName:'NYAPIT BARENG BPEDIA · COZZONE UP 2026',mode:'demo',paused:false,volume:70,bgmVolume:75,sfxVolume:85,voiceVolume:90,audioProfile:'crisp',compressor:'gentle',sound:true,duration:6000,odds:{bundling:3,grand:2,voucher:10,product:20,newuser:45,zonk:20},voucherTerms:'Gunakan voucher di aplikasi Beautypedia. Masukkan kode promo saat checkout di aplikasi Beautypedia.'};
function defaultState(){return {schema:1,campaignId:'cozzone-up-2026',revision:0,prizes:prizes(),settings:structuredClone(settings),history:[],audit:[],pending:null,dailyCounters:{}};}
const ZONK={id:'zonk',name:'Belum Beruntung',fullName:'Zonk · Coba lagi, ya!',tier:'zonk',stock:null,image:'/assets/products/zonk.svg',points:0,terms:'Terima kasih sudah bermain bersama BPEDIA.'};
module.exports={rows,prizes,settings,defaultState,ZONK};
