import bcrypt from 'bcryptjs';
import { query } from './pool.js';

const TURKEY_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta',
  'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale',
  'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin',
  'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa',
  'Siirt', 'Sinop', 'Sivas', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van',
  'Yalova', 'Yozgat', 'Zonguldak',
];

async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@dersimiz.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const hash = await bcrypt.hash(adminPassword, 10);

  await query(
    `INSERT INTO admin_users (email, password_hash, full_name)
     VALUES ($1, $2, 'Platform Admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = $2, updated_at = NOW()`,
    [adminEmail, hash]
  );
  console.log('Admin user created:', adminEmail);

  const adminRow = await query<{ id: string }>('SELECT id FROM admin_users WHERE email = $1', [adminEmail]);
  const adminId = adminRow.rows[0]?.id ?? null;

  const legalCount = await query<{ c: string }>('SELECT COUNT(*) as c FROM legal_documents');
  if (parseInt(legalCount.rows[0]?.c ?? '0', 10) === 0) {
    const legalTypes = [
      {
        type: 'terms_and_conditions',
        title: 'Kullanım Koşulları / Terms of Use',
        body: `# Kullanım Koşulları / Terms of Use

Bu platform Dersimiz üzerinden öğrenci ve öğretmenleri buluşturur. Hizmeti kullanarak aşağıdaki koşulları kabul etmiş olursunuz.

**Hizmetin kullanımı:** Platform, kişisel verilerinizi gizlilik politikamıza uygun şekilde işler. Uygunsuz içerik paylaşımı yasaktır ve moderasyon kurallarına tabidir.

**Sorumluluk:** Dersimiz, kullanıcılar arasındaki birebir iletişimden doğan anlaşmazlıklardan doğrudan sorumlu değildir. Ödeme ve ders düzenlemeleri taraflar arasında yapılır.

Güncel metin için uygulama içi yasal belgeleri takip edin.`,
      },
      {
        type: 'privacy_notice',
        title: 'Gizlilik Politikası / Privacy Notice',
        body: `# Gizlilik Politikası / Privacy Notice

Dersimiz olarak kişisel verilerinizi korumayı taahhüt ediyoruz.

**Toplanan veriler:** Telefon numarası, ad-soyad, profil fotoğrafı, mesajlaşma içeriği (moderasyon amacıyla), cihaz bilgisi ve ödeme ile ilgili işlem kayıtları.

**Amaç:** Hesap doğrulama, eşleştirme, iletişim, destek ve yasal yükümlülüklerin yerine getirilmesi.

**Paylaşım:** Yalnızca yasal zorunluluk veya açık rızanız çerçevesinde üçüncü taraflarla paylaşılır. Verileriniz güvenli sunucularda tutulur.

**Haklarınız:** Erişim, düzeltme ve silme taleplerinizi destek üzerinden iletebilirsiniz.`,
      },
      {
        type: 'cookie_policy',
        title: 'Çerez Politikası / Cookie Policy',
        body: `# Çerez Politikası / Cookie Policy

Dersimiz mobil uygulaması ve web arayüzünde teknik ve işlevsel amaçlarla çerez ve benzeri teknolojiler kullanılabilir.

**Kullanım amaçları:** Oturum yönetimi, dil tercihi, güvenlik ve performans iyileştirmesi.

**Üçüncü taraf çerezleri:** Analitik veya reklam ortaklarımız kendi çerezlerini kullanabilir; tercihlerinizi ilgili ayarlardan yönetebilirsiniz.

**Saklama süresi:** Oturum çerezleri oturum sonunda silinir; kalıcı çerezler politika metninde belirtilen süre kadar saklanır.`,
      },
      {
        type: 'acceptable_usage_policy',
        title: 'Kabul Edilebilir Kullanım Politikası / Acceptable Usage Policy',
        body: `# Kabul Edilebilir Kullanım Politikası / Acceptable Usage Policy

Dersimiz platformunda kabul edilebilir kullanım kuralları aşağıdaki gibidir.

**Yasak davranışlar:** Hakaret, tehdit, spam, dolandırıcılık girişimleri, reşit olmayanların güvenliğini ihlal eden içerik ve yasalara aykırı faaliyetler yasaktır.

**İçerik moderasyonu:** Mesajlar otomatik ve insan incelemesiyle denetlenir. İhlal tespit edildiğinde hesap kısıtlaması veya sonlandırma uygulanabilir.

**Öğretmen ve öğrenci davranışı:** Profil bilgilerinin doğru olması, randevu ve iletişimde saygılı davranılması beklenir. Şikayetler destek üzerinden değerlendirilir.`,
      },
    ];
    for (const doc of legalTypes) {
      await query(
        `INSERT INTO legal_documents (type, version, title, body_markdown, created_by)
         VALUES ($1, 1, $2, $3, $4)`,
        [doc.type, doc.title, doc.body, adminId]
      );
    }
    console.log('Legal documents created (4 types).');
  }

  let turkeyId: string | null = null;
  const existingTurkey = await query<{ id: string }>("SELECT id FROM locations WHERE type = 'country' AND code = 'TR'");
  if (existingTurkey.rows[0]) {
    turkeyId = existingTurkey.rows[0].id;
  } else {
    const trRes = await query<{ id: string }>(
      `INSERT INTO locations (type, name, code, sort_order) VALUES ('country', $1, 'TR', 0) RETURNING id`,
      [JSON.stringify({ tr: 'Türkiye', en: 'Turkey' })]
    );
    turkeyId = trRes.rows[0]?.id ?? null;
    console.log('Turkey (country) created.');
  }

  if (turkeyId) {
    const cityCount = await query<{ c: string }>('SELECT COUNT(*) as c FROM locations WHERE type = $1 AND parent_id = $2', ['city', turkeyId]);
    if (parseInt(cityCount.rows[0]?.c ?? '0', 10) === 0) {
      let sortOrder = 0;
      for (const cityName of TURKEY_CITIES) {
        await query(
          `INSERT INTO locations (parent_id, type, name, code, sort_order) VALUES ($1, 'city', $2, NULL, $3)`,
          [turkeyId, JSON.stringify({ tr: cityName, en: cityName }), sortOrder++]
        );
      }
      console.log('81 Turkish cities (provinces) created.');
    }
  }

  const schoolTypeCount = await query<{ c: string }>('SELECT COUNT(*) as c FROM school_types');
  if (parseInt(schoolTypeCount.rows[0]?.c ?? '0', 10) === 0) {
    const turkeySchoolTypes = [
      { name: { tr: 'Okul Öncesi', en: 'Pre-primary' }, order: 0 },
      { name: { tr: 'İlkokul', en: 'Primary School' }, order: 1 },
      { name: { tr: 'Ortaokul', en: 'Lower Secondary' }, order: 2 },
      { name: { tr: 'Lise', en: 'High School' }, order: 3 },
      { name: { tr: 'Üniversite', en: 'University' }, order: 4 },
    ];
    for (const st of turkeySchoolTypes) {
      await query(
        'INSERT INTO school_types (name, sort_order) VALUES ($1, $2)',
        [JSON.stringify(st.name), st.order]
      );
    }
    console.log('School types created (Turkey education system: Okul Öncesi → Üniversite).');
  }

  const planCount = await query<{ c: string }>('SELECT COUNT(*) as c FROM subscription_plans');
  if (parseInt(planCount.rows[0]?.c ?? '0', 10) === 0) {
    await query(
      `INSERT INTO subscription_plans (slug, display_name, description, monthly_price_cents, yearly_price_cents, features, is_active, is_default, sort_order)
       VALUES
       ('free', '{"tr": "Ücretsiz", "en": "Free"}', '{"tr": "Temel özellikler", "en": "Basic features"}', 0, 0, '["feature.basicMessages"]', true, true, 0),
       ('premium', '{"tr": "Premium", "en": "Premium"}', '{"tr": "Gelişmiş özellikler", "en": "Advanced features"}', 9900, 99900, '["feature.unlimitedMessages", "feature.prioritySupport"]', true, false, 1)`
    );
    console.log('Default subscription plans created.');
  }

  const boosterCount = await query<{ c: string }>('SELECT COUNT(*) as c FROM boosters');
  if (parseInt(boosterCount.rows[0]?.c ?? '0', 10) === 0) {
    await query(
      `INSERT INTO boosters (slug, display_name, description, price_cents, duration_days, search_ranking_boost, badge_text, is_active, sort_order)
       VALUES
       ('7day_boost', '{"tr": "7 Günlük Boost", "en": "7-Day Boost"}', '{"tr": "Aramada 7 gün öne çık", "en": "Feature in search for 7 days"}', 4900, 7, 30, '{"tr": "Öne Çıkan", "en": "Featured"}', true, 0),
       ('30day_boost', '{"tr": "30 Günlük Boost", "en": "30-Day Boost"}', '{"tr": "30 gün öne çık", "en": "Feature for 30 days"}', 14900, 30, 50, '{"tr": "Öne Çıkan", "en": "Featured"}', true, 1)`
    );
    console.log('Default boosters created.');
  }

  const lessonCount = await query<{ c: string }>('SELECT COUNT(*) as c FROM lesson_types');
  if (parseInt(lessonCount.rows[0]?.c ?? '0', 10) === 0) {
    await query(
      `INSERT INTO lesson_types (slug, name, sort_order) VALUES
       ('matematik', '{"tr": "Matematik", "en": "Mathematics"}', 0),
       ('fizik', '{"tr": "Fizik", "en": "Physics"}', 1),
       ('kimya', '{"tr": "Kimya", "en": "Chemistry"}', 2),
       ('ingilizce', '{"tr": "İngilizce", "en": "English"}', 3)`
    );
    console.log('Default lesson types created.');
  }

  console.log('Seed completed.');
  await (await import('./pool.js')).pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
