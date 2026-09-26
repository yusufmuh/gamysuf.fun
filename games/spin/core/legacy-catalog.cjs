'use strict';
const products = [
  ['powder-000','Lasting Matte Powder','Pinkflash Lasting Matte Loose Pressed Powder - 000','PINKFLASH','000','powder-000.jpg','Foto katalog pressed powder 000. Jenis loose / pressed perlu dicocokkan dengan barang booth.'],
  ['foundation-04','Fluid Foundation','FOCALLURE FLUID FOUNDATION FA30 - 04 trial size','FOCALLURE','04 · trial size','foundation-04.jpg','Foto katalog FA30 trial size shade 04; cocokkan stok fisik.'],
  ['duo-m03','Duo Lipgloss','PINKFLASH DUO LIPGLOSS PF-L13 - M03','PINKFLASH','M03','duo.jpg','Cocokkan shade M03 dengan stok booth.'],
  ['salsa-vinilash','Vinilash Curler','SALSA VINILASH','SALSA','Penjepit bulu mata','curler.jpg','VINILASH adalah penjepit bulu mata, bukan maskara. Warna mengikuti barang booth.'],
  ['stick-hs03','Duo Makeup Stick','PINKFLASH DUO MAKEUP STICK PF-F21- HS03','PINKFLASH','HS03','stick.jpg','Cocokkan HS03 dengan barang booth.'],
  ['creamy-oroi','Creamy Lipgloss','PINKFLASH CREAMY LIPGLOSS OROI','PINKFLASH','OROI / OR01*','creamy-or01.jpg','Input awal OROI; referensi katalog OR01. Konfirmasi ejaan shade.'],
  ['creamy-rdoi','Creamy Lipgloss','PINKFLASH CREAMY LIPGLOSS RDOI','PINKFLASH','RDOI / RD01*','creamy-rd01.jpg','Input awal RDOI; referensi katalog RD01. Konfirmasi ejaan shade.'],
  ['foundation-03','Fluid Foundation','FOCALLURE FLUID FOUNDATION FA30 - 03 trial size','FOCALLURE','03 · trial size','foundation-03.jpg','Foto katalog FA30 trial size shade 03; cocokkan stok fisik.'],
  ['powder-222','Lasting Matte Powder','Pinkflash Lasting Matte Loose Pressed Powder - 222','PINKFLASH','222','powder-222.jpg','Foto katalog pressed powder 222. Jenis loose / pressed perlu dicocokkan.'],
  ['lip-oil','Care Plus Lip Oil','Pinkflash Care Plus Lip Oil PF-L12','PINKFLASH','PF-L12','oil.jpg','Shade belum disebutkan; cocokkan barang booth.']
];
function defaultPrizes(){
 return [
  {id:'voucher-500000',name:'Voucher Rp500rb',fullName:'Hadiah utama · Voucher Rp500.000',brand:'BEAUTYPEDIA',variant:'Min. belanja Rp750.000',tier:'grand',discount:500000,minimum:750000,stock:1,image:'',imageChecked:true,enabled:true,description:'Potongan Rp500.000 dengan minimal belanja Rp750.000 di aplikasi Beautypedia. Hanya tersedia 1 voucher hadiah utama.',note:'Siapkan 1 kode voucher Rp500.000 yang sah. Masa berlaku dan penggabungan promo ditentukan tim booth.'},
  {id:'bundle',name:'Bundling',fullName:'Bundling produk skincare',brand:'BPEDIA',variant:'Paket skincare',tier:'bundling',stock:5,image:'',imageChecked:false,enabled:true,description:'Paket skincare untuk pengunjung booth. Isi paket ditentukan tim Beautypedia.',note:'Isi dan foto bundling belum diberikan. Foto paket asli dapat diunggah sebagai pelengkap; tidak wajib untuk mulai bermain.'},
  ...[[25,25000,20],[50,50000,20],[100000,150000,20]].map(([discount,minimum,stock])=>({id:`voucher-${discount}`,name:discount===100000?'Voucher Rp100rb':`Voucher ${discount}%`,fullName:discount===100000?'Voucher potongan Rp100.000':`Voucher potongan ${discount}%`,brand:'BEAUTYPEDIA',variant:`Min. belanja Rp${minimum.toLocaleString('id-ID')}`,tier:'voucher',discount,minimum,stock,image:'',imageChecked:true,enabled:true,description:`Berlaku di aplikasi Beautypedia. Minimal belanja Rp${minimum.toLocaleString('id-ID')}.`,note:'Kuota 20 per jenis telah dikonfirmasi. Masa berlaku, batas diskon persen, dan kode voucher ditentukan tim booth.'})),
  ...products.map(([id,name,fullName,brand,variant,image,note])=>({id,name,fullName,brand,variant,tier:'product',stock:20,image:`/assets/products/${image}`,imageChecked:false,enabled:true,description:'Hadiah produk gratis. Tunjukkan hasil ini kepada petugas booth.',note}))
 ];
}
const ZONK={id:'zonk',name:'Belum beruntung',fullName:'Zonk · belum beruntung',tier:'zonk',brand:'BPEDIA',variant:'Tetap cantik, tetap semangat',image:'',stock:null,description:'Belum dapat hadiah di putaran ini. Terima kasih sudah bermain bersama Bpedia!'};
function defaultState(){return {schema:2,inventoryVersion:3,revision:0,prizes:defaultPrizes(),settings:{eventName:'Beauty, with a little luck.',mode:'demo',confirmed:false,paused:false,volume:70,sound:true,duration:6500,grand:.2,bundle:2,zonk:1,voucherWeight:40,productWeight:57,voucherTerms:'Voucher hanya berlaku di aplikasi Beautypedia. Tanyakan kode, batas maksimum potongan, masa berlaku, dan ketentuan penggabungan promo kepada petugas sebelum bermain.'},history:[],audit:[],pending:null};}
module.exports={defaultPrizes,defaultState,ZONK};
