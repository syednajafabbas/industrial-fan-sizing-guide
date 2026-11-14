/**
 * Cloud Electrical Co. — Industrial Fan Sizing & Duty-Point Calculator
 * Supports English (en) and Arabic (ar) pages with real unit conversions
 * and KSA 60Hz application presets.
 */
(function () {
  "use strict";

  var lang = document.documentElement.lang === "ar" ? "ar" : "en";
  var CFM_TO_M3H = 1.6990108;
  var CFM_TO_LS = 0.47194745;
  var INWG_TO_PA = 249.0889;

  var BASE_URL = lang === "ar" ? "https://www.cloudventsa.com/ar" : "https://www.cloudventsa.com";

  var PRESETS = {
    kitchen: {
      ach: 30,
      enName: "Commercial Kitchen / Hood Exhaust",
      arName: "مطبخ تجاري / شفط هود المطابخ",
      links: [
        { path: "/kitchen-exhaust-fan", en: "Kitchen Exhaust Fans", ar: "مراوح شفط المطابخ" },
        { path: "/roof-fan/upblast-roof-fan", en: "RCU Upblast Roof Fan", ar: "مروحة سقفية RCU دفع للأعلى" },
        { path: "/fresh-air-fan", en: "Fresh Air Make-Up Fans", ar: "مراوح تغذية الهواء النقي" }
      ]
    },
    warehouse: {
      ach: 10,
      enName: "Warehouse / Logistics Center",
      arName: "مستودع / مركز لوجستي",
      links: [
        { path: "/hvls-ceiling-fan", en: "HVLS Ceiling Fans", ar: "مراوح سقفية HVLS" },
        { path: "/roof-fan/downblast-roof-fan", en: "RCD Downblast Roof Fan", ar: "مروحة سقفية RCD" },
        { path: "/roof-fan/axial-roof-fan", en: "DWT Axial Roof Fan", ar: "مروحة سقفية محورية DWT" }
      ]
    },
    factory: {
      ach: 18,
      enName: "Factory / Welding / Heat Workshop",
      arName: "مصنع / ورشة / إزالة حرارة وأدخنة",
      links: [
        { path: "/wall-mounted-fan/wall-mounted-shutter-exhaust-fan", en: "Hammer Wall Shutter Fan", ar: "مروحة جدارية بشتر Hammer" },
        { path: "/roof-fan/upblast-roof-fan", en: "RCU Upblast Roof Fan", ar: "مروحة سقفية RCU" },
        { path: "/centrifugal-blower", en: "Centrifugal Blowers", ar: "منافيخ الطرد المركزي" }
      ]
    },
    washroom: {
      ach: 12,
      enName: "Commercial Washroom / Restroom",
      arName: "دورات مياه تجارية",
      links: [
        { path: "/bathroom-exhaust-fan", en: "Bathroom Exhaust Fans", ar: "مراوح شفط الحمامات" },
        { path: "/inline-fan", en: "Inline Duct Fans", ar: "مراوح الشفط داخل الدكت" },
        { path: "/kdk-exhaust-fan", en: "KDK Exhaust Fans", ar: "مراوح شفط KDK" }
      ]
    },
    office: {
      ach: 6,
      enName: "Office / Retail / Corridor Ventilation",
      arName: "مكاتب / معارض / ممرات تجارية",
      links: [
        { path: "/ceiling-exhaust-fan", en: "Ceiling Exhaust Fans", ar: "مراوح الشفط السقفية" },
        { path: "/inline-fan", en: "Inline Duct Fans", ar: "مراوح داخل الدكت" },
        { path: "/tat-exhaust-fan", en: "TAT Exhaust Fans", ar: "مراوح شفط TAT" }
      ]
    },
    electrical: {
      ach: 20,
      enName: "Mechanical / Electrical / Generator Room",
      arName: "غرفة كهرباء / ميكانيكا / مولدات",
      links: [
        { path: "/wall-mounted-fan", en: "Wall Mounted Exhaust Fans", ar: "مراوح الشفط الجدارية" },
        { path: "/centrifugal-blower", en: "Centrifugal Blowers", ar: "منافيخ الطرد المركزي" },
        { path: "/inline-fan/axial-inline-fan", en: "VMD-A Axial Inline Fan", ar: "مروحة محورية داخل الدكت VMD-A" }
      ]
    },
    poultry: {
      ach: 40,
      enName: "Poultry House / Greenhouse (Tunnel Ventilation)",
      arName: "مزارع دواجن / بيوت محمية",
      links: [
        { path: "/wall-mounted-fan/wall-mounted-shutter-exhaust-fan", en: "Hammer Shutter Exhaust Fan", ar: "مروحة جدارية بشتر Hammer" },
        { path: "/wall-mounted-fan", en: "Wall Mounted Exhaust Fans", ar: "مراوح الشفط الجدارية" }
      ]
    },
    confined: {
      ach: 25,
      enName: "Construction / Confined Space Purge",
      arName: "مواقع بناء / تهوية أماكن مغلقة",
      links: [
        { path: "/portable-exhaust-fan", en: "Portable Exhaust Fans", ar: "مراوح الشفط المتنقلة" },
        { path: "/portable-exhaust-fan/portable-ventilator-blower-fan", en: "Portable Ventilator Blower", ar: "منفاخ تهوية متنقل" }
      ]
    }
  };

  var PRESSURE_BANDS = {
    free: { minPa: 25, maxPa: 75, en: "Free-discharge (wall louver / roof curb, no duct)", ar: "طرد مباشر (جداري/سقفي بدون دكت)" },
    short: { minPa: 100, maxPa: 220, en: "Short duct run (< 10 m, 1–2 elbows)", ar: "دكت قصير (أقل من 10 م، 1–2 كوع)" },
    medium: { minPa: 250, maxPa: 450, en: "Medium duct network (branches + grille/damper)", ar: "شبكة دكت متوسطة (تفرعات + مخمد)" },
    high: { minPa: 500, maxPa: 900, en: "High static (kitchen hood, grease filters, long duct)", ar: "ضغط ساكن عالٍ (هود مطبخ، فلاتر، دكت طويل)" }
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function formatNum(value, decimals) {
    return Number(value).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
      maximumFractionDigits: decimals || 0,
      minimumFractionDigits: decimals || 0
    });
  }

  function updateSizing() {
    var unitEl = byId("unitSystem");
    var lenEl = byId("roomLength");
    var widEl = byId("roomWidth");
    var hgtEl = byId("roomHeight");
    var appEl = byId("appPreset");
    var achEl = byId("customAch");
    var ductEl = byId("ductType");
    var marginEl = byId("safetyMargin");

    if (!unitEl || !lenEl || !widEl || !hgtEl || !appEl || !achEl || !ductEl || !marginEl) {
      return;
    }

    var isMetric = unitEl.value === "m";
    var l = Math.max(0.5, parseFloat(lenEl.value) || 0);
    var w = Math.max(0.5, parseFloat(widEl.value) || 0);
    var h = Math.max(1.0, parseFloat(hgtEl.value) || 0);
    var ach = Math.max(1, parseFloat(achEl.value) || 1);
    var margin = Math.max(0, Math.min(50, parseFloat(marginEl.value) || 0));

    var volFt3 = isMetric ? l * w * h * 35.3146667 : l * w * h;
    var volM3 = volFt3 / 35.3146667;

    var baseCfm = (volFt3 * ach) / 60;
    var designCfm = baseCfm * (1 + margin / 100);
    var designM3h = designCfm * CFM_TO_M3H;
    var designLs = designCfm * CFM_TO_LS;

    var band = PRESSURE_BANDS[ductEl.value] || PRESSURE_BANDS.short;
    var minInWg = band.minPa / INWG_TO_PA;
    var maxInWg = band.maxPa / INWG_TO_PA;

    byId("outCfm").textContent = formatNum(Math.round(designCfm), 0) + " CFM";
    byId("outM3h").textContent = formatNum(Math.round(designM3h), 0) + " m³/h";
    byId("outLs").textContent = formatNum(Math.round(designLs), 0) + " L/s";
    byId("outVolume").textContent =
      formatNum(volM3, 1) + " m³ (" + formatNum(Math.round(volFt3), 0) + " ft³)";
    byId("outPressure").textContent =
      band.minPa + "–" + band.maxPa + " Pa (" + minInWg.toFixed(2) + "–" + maxInWg.toFixed(2) + " in. wg)";

    var preset = PRESETS[appEl.value] || PRESETS.warehouse;
    var recContainer = byId("recLinks");
    recContainer.innerHTML = "";
    preset.links.forEach(function (item) {
      var a = document.createElement("a");
      a.className = "rec-chip";
      a.href = BASE_URL + item.path;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = lang === "ar" ? item.ar : item.en;
      recContainer.appendChild(a);
    });

    var waBtn = byId("waQuoteBtn");
    if (waBtn) {
      var appLabel = lang === "ar" ? preset.arName : preset.enName;
      var msg =
        lang === "ar"
          ? "مرحباً سحابة الكهرباء، أحتاج عرض سعر لمروحة بنقطة تشغيل: " +
            Math.round(designCfm) +
            " CFM (" +
            Math.round(designM3h) +
            " م³/ساعة) عند ضغط ساكن " +
            band.minPa +
            "-" +
            band.maxPa +
            " باسكال، التطبيق: " +
            appLabel +
            " (تردد 60 هرتز)."
          : "Hello Cloud Electrical, I need a fan quotation for duty point: " +
            Math.round(designCfm) +
            " CFM (" +
            Math.round(designM3h) +
            " m³/h) @ " +
            band.minPa +
            "-" +
            band.maxPa +
            " Pa static pressure, Application: " +
            appLabel +
            " (60Hz KSA).";
      waBtn.href = "https://wa.me/966562598137?text=" + encodeURIComponent(msg);
      waBtn.dataset.summary = msg;
    }
  }

  function setupSizingCalculator() {
    var appEl = byId("appPreset");
    var achEl = byId("customAch");
    var unitEl = byId("unitSystem");
    var dimLabels = document.querySelectorAll("[data-dim-unit]");

    if (!appEl || !achEl) return;

    appEl.addEventListener("change", function () {
      var preset = PRESETS[appEl.value];
      if (preset) {
        achEl.value = preset.ach;
      }
      updateSizing();
    });

    if (unitEl) {
      unitEl.addEventListener("change", function () {
        var suffix = unitEl.value === "m" ? (lang === "ar" ? "(م)" : "(m)") : (lang === "ar" ? "(قدم)" : "(ft)");
        dimLabels.forEach(function (el) {
          el.textContent = suffix;
        });
        updateSizing();
      });
    }

    ["roomLength", "roomWidth", "roomHeight", "customAch", "ductType", "safetyMargin"].forEach(function (id) {
      var el = byId(id);
      if (el) el.addEventListener("input", updateSizing);
      if (el) el.addEventListener("change", updateSizing);
    });

    var copyBtn = byId("copySpecBtn");
    var feedback = byId("copyFeedback");
    var waBtn = byId("waQuoteBtn");
    if (copyBtn && waBtn) {
      copyBtn.addEventListener("click", function () {
        var text = waBtn.dataset.summary || "";
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            if (feedback) {
              feedback.textContent = lang === "ar" ? "تم نسخ مواصفات نقطة التشغيل." : "Duty-point summary copied to clipboard.";
              setTimeout(function () {
                feedback.textContent = "";
              }, 3000);
            }
          });
        }
      });
    }

    updateSizing();
  }

  function setupConverter() {
    var cfmIn = byId("convCfm");
    var m3hIn = byId("convM3h");
    var lsIn = byId("convLs");
    var paIn = byId("convPa");
    var inwgIn = byId("convInwg");

    if (cfmIn && m3hIn && lsIn) {
      cfmIn.addEventListener("input", function () {
        var v = parseFloat(cfmIn.value);
        if (isNaN(v)) return;
        m3hIn.value = (v * CFM_TO_M3H).toFixed(1);
        lsIn.value = (v * CFM_TO_LS).toFixed(1);
      });
      m3hIn.addEventListener("input", function () {
        var v = parseFloat(m3hIn.value);
        if (isNaN(v)) return;
        cfmIn.value = (v / CFM_TO_M3H).toFixed(1);
        lsIn.value = ((v / CFM_TO_M3H) * CFM_TO_LS).toFixed(1);
      });
      lsIn.addEventListener("input", function () {
        var v = parseFloat(lsIn.value);
        if (isNaN(v)) return;
        cfmIn.value = (v / CFM_TO_LS).toFixed(1);
        m3hIn.value = ((v / CFM_TO_LS) * CFM_TO_M3H).toFixed(1);
      });
    }

    if (paIn && inwgIn) {
      paIn.addEventListener("input", function () {
        var v = parseFloat(paIn.value);
        if (isNaN(v)) return;
        inwgIn.value = (v / INWG_TO_PA).toFixed(2);
      });
      inwgIn.addEventListener("input", function () {
        var v = parseFloat(inwgIn.value);
        if (isNaN(v)) return;
        paIn.value = Math.round(v * INWG_TO_PA);
      });
    }
  }

  function setupSelector() {
    var mountEl = byId("selMount");
    var envEl = byId("selEnv");
    var powerEl = byId("selPower");
    var outTitle = byId("selTitle");
    var outDesc = byId("selDesc");
    var outLink = byId("selLink");

    if (!mountEl || !envEl || !powerEl || !outTitle || !outDesc || !outLink) return;

    function recommend() {
      var mount = mountEl.value;
      var env = envEl.value;
      var power = powerEl.value;

      var rec = {
        enTitle: "RCD / DWT Roof Exhaust Series",
        arTitle: "سلسلة مراوح الأسطح RCD / DWT",
        enDesc: "Best suited for general roof ventilation with low-to-medium static pressure. Verify 60Hz motor nameplate.",
        arDesc: "مناسبة لتهوية الأسطح العامة عند ضغط ساكن منخفض إلى متوسط مع التحقق من لوحة محرك 60 هرتز.",
        path: "/roof-fan"
      };

      if (env === "grease" || (mount === "roof" && env === "grease")) {
        rec = {
          enTitle: "RCU Upblast Centrifugal Roof Fan",
          arTitle: "مروحة سقفية طرد مركزي للدفع للأعلى RCU",
          enDesc: "Discharges grease-laden kitchen exhaust vertically away from roof surfaces; compatible with high static hood ducts.",
          arDesc: "تطرد أبخرة وزيوت المطابخ عمودياً بعيداً عن سطح المبنى وتتحمل الضغط الساكن العالي لمداخن المطابخ.",
          path: "/roof-fan/upblast-roof-fan"
        };
      } else if (mount === "roof" && env === "highstatic") {
        rec = {
          enTitle: "RC-A Centrifugal Roof Fan",
          arTitle: "مروحة سقفية طرد مركزي RC-A",
          enDesc: "Centrifugal impeller handles ducted roof exhaust where axial fans would stall against static pressure.",
          arDesc: "ريشة طرد مركزي مناسبة للشفط عبر مجاري الهواء على الأسطح حيث تفقد المراوح المحورية كفاءتها.",
          path: "/roof-fan/centrifugal-roof-fan"
        };
      } else if (mount === "roof") {
        rec = {
          enTitle: "RCD Downblast / DWT Axial Roof Fan",
          arTitle: "مروحة سقفية RCD / محورية DWT",
          enDesc: "High-airflow roof exhaust for warehouses, factories, and commercial buildings without heavy grease.",
          arDesc: "تدفق هواء عالٍ لتهوية المستودعات والمصانع والمباني التجارية غير المحتوية على دهون.",
          path: "/roof-fan/downblast-roof-fan"
        };
      } else if (mount === "wall") {
        rec = {
          enTitle: env === "dust" ? "Hammer Wall Mounted Shutter Exhaust Fan" : "Wall Mounted Exhaust Fan with Damper / KDK / TAT",
          arTitle: env === "dust" ? "مروحة جدارية بشتر ثقيل Hammer" : "مروحة جدارية مع مخمد / KDK / TAT",
          enDesc: "Direct wall discharge with automatic gravity shutters to block dust and backdrafts when idle.",
          arDesc: "طرد جداري مباشر مع شتر تلقائي لمنع دخول الغبار وارتداد الهواء عند التوقف.",
          path: env === "dust" ? "/wall-mounted-fan/wall-mounted-shutter-exhaust-fan" : "/wall-mounted-fan"
        };
      } else if (mount === "inline") {
        if (env === "smoke") {
          rec = {
            enTitle: "VDO Tube Axial / Smoke Extraction Fan",
            arTitle: "مروحة أنبوبية محورية VDO لسحب الدخان",
            enDesc: "Engineered for high-volume ducted extraction and emergency smoke/heat exhaust applications.",
            arDesc: "مصممة للسحب الأنبوبي عالي التدفق وتطبيقات طرد الدخان والحرارة.",
            path: "/inline-fan/vdo-axial-smoke-extraction-fan"
          };
        } else if (env === "highstatic") {
          rec = {
            enTitle: "CHA Centrifugal Box Inline Fan",
            arTitle: "مروحة صندوقية طرد مركزي داخل الدكت CHA",
            enDesc: "Centrifugal box geometry maintains airflow through longer duct branches, filters, and acoustic bends.",
            arDesc: "تصميم صندوقي بالطرد المركزي يحافظ على التدفق عبر مجاري الهواء الطويلة والفلاتر.",
            path: "/inline-fan/centrifugal-box-inline-fan"
          };
        } else {
          rec = {
            enTitle: "Circular Inline Duct Fan (Plastic / Steel)",
            arTitle: "مروحة دائرية داخل الدكت (بلاستيك / حديد)",
            enDesc: "Compact inline duct booster for washrooms, offices, and light commercial supply/exhaust ducts.",
            arDesc: "حل مدمج داخل الدكت لدورات المياه والمكاتب ومجاري الهواء التجارية الخفيفة.",
            path: "/inline-fan"
          };
        }
      } else if (mount === "ceiling") {
        rec = {
          enTitle: env === "dust" ? "HVLS Industrial Ceiling Fan" : "KDK / TAT Ceiling Cassette Exhaust Fan",
          arTitle: env === "dust" ? "مروحة سقفية صناعية HVLS" : "مروحة شفط سقفية KDK / TAT",
          enDesc: env === "dust"
            ? "Large-diameter destratification fan for high-bay warehouses and factories to improve air circulation."
            : "Quiet ducted ceiling exhaust for offices, clinics, and commercial washrooms.",
          arDesc: env === "dust"
            ? "مروحة بقطر كبير لتحريك وتوزيع الهواء في المستودعات والمصانع ذات الأسقف العالية."
            : "شفط سقفي هادئ متصل بالدكت للمكاتب والعيادات ودورات المياه التجارية.",
          path: env === "dust" ? "/hvls-ceiling-fan" : "/ceiling-exhaust-fan"
        };
      } else if (mount === "industrial") {
        rec = {
          enTitle: "DE / CBA Industrial Centrifugal Blower",
          arTitle: "منفاخ طرد مركزي صناعي DE / CBA",
          enDesc: "Built for high static pressure industrial processes, dust extraction, and heavy duct resistance.",
          arDesc: "مخصص للضغوط الساكنة العالية في العمليات الصناعية وسحب الأبخرة ومقاومة الدكت العالية.",
          path: "/centrifugal-blower"
        };
      } else if (mount === "portable") {
        rec = {
          enTitle: "Portable Ventilator Blower / Drum Fan",
          arTitle: "منفاخ تهوية متنقل / مروحة برميل صناعية",
          enDesc: "Rapid spot cooling and fresh air purging via flexible ducting for maintenance and confined spaces.",
          arDesc: "تبريد موضعي سريع وضخ هواء نقي عبر دكت مرن لأعمال الصيانة والأماكن المغلقة.",
          path: "/portable-exhaust-fan"
        };
      }

      var powerNote =
        power === "3ph"
          ? lang === "ar"
            ? " (تحديد محرك 380–400 فولت / 3 فاز / 60 هرتز)"
            : " (Specify 380–400V, 3-Phase, 60Hz)"
          : lang === "ar"
          ? " (تحديد محرك 220–240 فولت / 1 فاز / 60 هرتز)"
          : " (Specify 220–240V, 1-Phase, 60Hz)";

      outTitle.textContent = (lang === "ar" ? rec.arTitle : rec.enTitle) + powerNote;
      outDesc.textContent = lang === "ar" ? rec.arDesc : rec.enDesc;
      outLink.href = BASE_URL + rec.path;
      outLink.textContent = lang === "ar" ? "عرض الموديلات في سحابة الكهرباء ←" : "View Matching Models on Cloudventsa →";
    }

    [mountEl, envEl, powerEl].forEach(function (el) {
      el.addEventListener("change", recommend);
    });
    recommend();
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupSizingCalculator();
    setupConverter();
    setupSelector();
  });
})();
