# WHOIS WEIRD

เว็บตรวจสอบ Domain name และ IP Address สำหรับ `weird-ip-blacklist.netlify.app`

## ความสามารถ

- ตรวจข้อมูลเจ้าของและการจดทะเบียนผ่าน RDAP
- แสดง DNS, Nameserver, ASN, องค์กร, ประเทศ และช่วง IP
- ตรวจสัญญาณ Proxy, Tor, Hosting และ Mobile network
- เปรียบเทียบกับรายการ IP เฝ้าระวังใน `src/data/threats.txt`
- รองรับมือถือ คีย์บอร์ด และการคัดลอกสรุปผล

ข้อมูลภายนอกมาจาก RDAP.org, Cloudflare DNS และ IPWhois โดย Netlify Function ทำหน้าที่ตรวจรูปแบบ input และรวมผลลัพธ์ ไม่ต้องใช้ API key

## พัฒนาในเครื่อง

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Netlify ใช้ค่าจาก `netlify.toml` และ deploy อัตโนมัติเมื่อมีการ push เข้า branch หลัก
