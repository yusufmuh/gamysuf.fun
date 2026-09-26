'use strict';
// The ten free products confirmed in the latest Campaign Roulette image.
const rows=[
 ['powder-000','Lasting Matte Powder','Pinkflash Lasting Matte Loose Pressed Powder - 000','PINKFLASH','000','powder-000.jpg'],
 ['foundation-04','Fluid Foundation','FOCALLURE FLUID FOUNDATION FA30 - 04 trial size','FOCALLURE','04 · trial size','foundation-04.jpg'],
 ['duo-m03','Duo Lipgloss','PINKFLASH DUO LIPGLOSS PF-L13 - M03','PINKFLASH','M03','duo.jpg'],
 ['salsa-vinilash','Vinilash','SALSA VINILASH','SALSA','Penjepit bulu mata','curler.jpg'],
 ['stick-hs03','Duo Makeup Stick','PINKFLASH DUO MAKEUP STICK PF-F21 - HS03','PINKFLASH','HS03','stick.jpg'],
 ['creamy-or01','Creamy Lipgloss','PINKFLASH CREAMY LIPGLOSS OR01','PINKFLASH','OR01','creamy-or01.jpg'],
 ['creamy-rd01','Creamy Lipgloss','PINKFLASH CREAMY LIPGLOSS RD01','PINKFLASH','RD01','creamy-rd01.jpg'],
 ['foundation-03','Fluid Foundation','FOCALLURE FLUID FOUNDATION FA30 - 03 trial size','FOCALLURE','03 · trial size','foundation-03.jpg'],
 ['powder-222','Lasting Matte Powder','Pinkflash Lasting Matte Loose Pressed Powder - 222','PINKFLASH','222','powder-222.jpg'],
 ['lip-oil','Care Plus Lip Oil','Pinkflash Care Plus Lip Oil PF-L12','PINKFLASH','PF-L12','oil.jpg']
];
const settings={eventName:'PESTA FOLKA · SPIN & WIN',mode:'demo',confirmed:false,paused:false,volume:75,sound:true,duration:6500,grand:.2,bundle:2,zonk:1,mystery:12,bonusGrandMultiplier:10,bonusBundleMultiplier:6,voucherWeight:20,productWeight:80,minPurchase:0,voice:true,attract:false,attractInterval:90,voucherTerms:'Gunakan kode pada tiket saat checkout di aplikasi Beautypedia. Pastikan potongan muncul sebelum membayar. Minimum belanja mengikuti masing-masing tiket. Masa berlaku, batas diskon persen, dan penggabungan promo mengikuti ketentuan yang ditetapkan tim Beautypedia.'};
function prizes(){
 const vouchers=[[500000,700000,1,'BPFOLKA500','grand'],[25,25000,20,'BPFOLKA25','voucher'],[50,50000,20,'BPFOLKA50','voucher'],[100000,150000,20,'BPFOLKA100','voucher']].map(([discount,minimum,stock,promoCode,tier])=>({id:`voucher-${discount}`,name:discount<100?`Voucher ${discount}%`:`Voucher Rp${discount/1000}rb`,fullName:(tier==='grand'?'Hadiah utama · ':'')+(discount<100?`Voucher potongan ${discount}%`:`Voucher potongan Rp${discount.toLocaleString('id-ID')}`),brand:'BEAUTYPEDIA',variant:`Min. belanja Rp${minimum.toLocaleString('id-ID')}`,tier,discount,minimum,stock,initialStock:stock,promoCode,image:`/assets/products/ticket-${promoCode}.png`,imageChecked:true,enabled:true,description:`Gunakan ${promoCode} di aplikasi Beautypedia. Minimal belanja Rp${minimum.toLocaleString('id-ID')}.`,note:'Kode promo dari pengguna. Bukan kode unik per lembar; penukaran dan pembatasan berlaku di aplikasi Beautypedia.'}));
 const bundles=[1,3].map(n=>({id:`bundle-${n}`,name:'Bundling',fullName:`PRODUK BUNDLING PAKET ${n}`,brand:'BEAUTYPEDIA',variant:`Paket ${n}`,tier:'bundling',stock:3,initialStock:3,image:'',imageChecked:false,enabled:true,description:`Bundling Paket ${n}. Petugas menyerahkan paket fisik sesuai nomor.`,note:'Isi dan foto paket belum diberikan. Unggah foto paket yang benar di dashboard; tidak ada isi skincare yang diasumsikan.'}));
 const products=rows.map(([id,name,fullName,brand,variant,image])=>({id,name,fullName,brand,variant,tier:'product',stock:20,initialStock:20,image:`/assets/products/${image}`,imageChecked:false,enabled:true,description:'Hadiah produk gratis Pesta Folka. Cocokkan kode hasil dan barang fisik dengan petugas.',note:'Foto katalog produk asli. Cocokkan kemasan, ukuran, dan varian dengan stok booth.'}));
 return [vouchers[0],...bundles,...vouchers.slice(1),...products];
}
module.exports={rows,settings,prizes};
