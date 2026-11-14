/**
 * Interactive tabs, CFM/ACH duty calculator, unit converter, and fan selector.
 * Clean, lightweight client-side logic for EN and AR pages.
 */
(function () {
  "use strict";

  var lang = document.documentElement.lang === "ar" ? "ar" : "en";
  var CFM_TO_M3H = 1.6990108;
  var CFM_TO_LS = 0.47194745;
  var INWG_TO_PA = 249.0889;
  var BASE_URL = lang === "ar" ? "https://www.cloudventsa.com/ar" : "https://www.cloudventsa.com";

  var PRESETS = {
    warehouse: {
      ach: 10,
      enName: "Warehouse / Logistics",
      arName: "مستودع / مركز لوجستي",
      links: [
        { path: "/hvls-ceiling-fan", en: "HVLS Ceiling Fans", ar: "مراوح سقفية HVLS" },
        { path: "/roof-fan/downblast-roof-fan", en: "Downblast Roof Fans", ar: "مراوح الشفط للأسطح" },
        { path: "/roof-fan/axial-roof-fan", en: "Axial Roof Fans", ar: "مراوح الأسطح المحورية" }
      ]
    },
    factory: {
      ach: 18,
      enName: "Factory / Workshop",
      arName: "مصنع / ورشة عمل",
      links: [
        { path: "/wall-mounted-fan/wall-mounted-shutter-exhaust-fan", en: "Wall Shutter Fans", ar: "مراوح جدارية بشتر" },
        { path: "/roof-fan/upblast-roof-fan", en: "Upblast Roof Fans", ar: "مراوح أسطح للدفع للأعلى" },
        { path: "/centrifugal-blower", en: "Centrifugal Blowers", ar: "منافيخ الطرد المركزي" }
      ]
    },
    kitchen: {
      ach: 30,
      enName: "Commercial Kitchen",
      arName: "مطبخ تجاري",
      links: [
        { path: "/kitchen-exhaust-fan", en: "Kitchen Exhaust Fans", ar: "مراوح شفط المطابخ" },
        { path: "/roof-fan/upblast-roof-fan", en: "RCU Upblast Roof Fan", ar: "مروحة سقفية للمطابخ RCU" },
        { path: "/fresh-air-fan", en: "Fresh Air Fans", ar: "مراوح تغذية الهواء النقي" }
      ]
    },
    washroom: {
      ach: 12,
      enName: "Washroom / Restroom",
      arName: "دورات مياه",
      links: [
        { path: "/bathroom-exhaust-fan", en: "Bathroom Exhaust Fans", ar: "مراوح شفط الحمامات" },
        { path: "/inline-fan", en: "Inline Duct Fans", ar: "مراوح الشفط داخل الدكت" },
        { path: "/kdk-exhaust-fan", en: "KDK Exhaust Fans", ar: "مراوح شفط KDK" }
      ]
    },
    office: {
      ach: 6,
      enName: "Office / Commercial",
      arName: "مكتب / معرض تجاري",
      links: [
        { path: "/ceiling-exhaust-fan", en: "Ceiling Exhaust Fans", ar: "مراوح الشفط السقفية" },
        { path: "/inline-fan", en: "Inline Duct Fans", ar: "مراوح داخل الدكت" },
        { path: "/tat-exhaust-fan", en: "TAT Exhaust Fans", ar: "مراوح شفط TAT" }
      ]
    },
    electrical: {
      ach: 20,
      enName: "Electrical / Mechanical Room",
      arName: "غرفة كهرباء / ميكانيكا",
      links: [
        { path: "/wall-mounted-fan", en: "Wall Mounted Fans", ar: "مراوح الشفط الجدارية" },
        { path: "/centrifugal-blower", en: "Centrifugal Blowers", ar: "منافيخ الطرد المركزي" },
        { path: "/inline-fan/axial-inline-fan", en: "Axial Inline Fans", ar: "مراوح محورية داخل الدكت" }
      ]
    },
    poultry: {
      ach: 40,
      enName: "Poultry / Greenhouse",
      arName: "مزرعة دواجن / بيت محمي",
      links: [
        { path: "/wall-mounted-fan/wall-mounted-shutter-exhaust-fan", en: "Hammer Shutter Fans", ar: "مراوح جدارية بشتر Hammer" },
        { path: "/wall-mounted-fan", en: "Wall Exhaust Fans", ar: "مراوح الشفط الجدارية" }
      ]
    }
  };

  var PRESSURE_BANDS = {
    free: { minPa: 25, maxPa: 75 },
    short: { minPa: 100, maxPa: 220 },
    medium: { minPa: 250, maxPa: 450 },
    high: { minPa: 500, maxPa: 900 }
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

  function setupTabs() {
    var buttons = document.querySelectorAll("[role='tab']");
    var panels = document.querySelectorAll("[role='tabpanel']");
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.getAttribute("aria-controls");
        buttons.forEach(function (b) {
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        panels.forEach(function (p) {
          p.hidden = p.id !== targetId;
        });
      });
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

    if (!unitEl || !lenEl || !widEl || !hgtEl || !appEl || !achEl || !ductEl || !marginEl) return;

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
    byId("outVolume").textContent = formatNum(volM3, 1) + " m³";
    byId("outPressure").textContent =
      band.minPa + "–" + band.maxPa + " Pa (" + minInWg.toFixed(2) + "–" + maxInWg.toFixed(2) + " in. wg)";

    var preset = PRESETS[appEl.value] || PRESETS.warehouse;
    var recContainer = byId("recLinks");
    recContainer.innerHTML = "";
    preset.links.forEach(function (item) {
      var a = document.createElement("a");
      a.className = "chip";
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
          ? "طلب تسعير مروحة — نقطة التشغيل: " +
            Math.round(designCfm) +
            " CFM (" +
            Math.round(designM3h) +
            " م³/ساعة) عند ضغط ساكن " +
            band.minPa +
            "-" +
            band.maxPa +
            " باسكال، التطبيق: " +
            appLabel +
            " (60 هرتز)."
          : "Fan Duty Quote Request: " +
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
      if (preset) achEl.value = preset.ach;
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
      if (el) {
        el.addEventListener("input", updateSizing);
        el.addEventListener("change", updateSizing);
      }
    });

    var copyBtn = byId("copySpecBtn");
    var feedback = byId("copyFeedback");
    var waBtn = byId("waQuoteBtn");
    if (copyBtn && waBtn) {
      copyBtn.addEventListener("click", function () {
        var text = waBtn.dataset.summary || "";
        if (!text || !navigator.clipboard || !navigator.clipboard.writeText) return;
        navigator.clipboard.writeText(text).then(function () {
          if (feedback) {
            feedback.textContent = lang === "ar" ? "تم نسخ الملخص." : "Copied to clipboard.";
            setTimeout(function () {
              feedback.textContent = "";
            }, 3000);
          }
        });
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
        enTitle: "Downblast / Axial Roof Fan (RCD / DWT)",
        arTitle: "مروحة سقفية للأسطح (RCD / DWT)",
        enDesc: "Ideal for general warehouse or commercial roof exhaust at low-to-medium static pressure.",
        arDesc: "مناسبة لتهوية أسطح المستودعات والمباني التجارية عند ضغط ساكن منخفض إلى متوسط.",
        path: "/roof-fan"
      };

      if (env === "grease") {
        rec = {
          enTitle: "Upblast Centrifugal Roof Fan (RCU)",
          arTitle: "مروحة سقفية دفع للأعلى للمطابخ (RCU)",
          enDesc: "Discharges kitchen grease exhaust vertically away from the roof and handles hood/filter static pressure.",
          arDesc: "تطرد أبخرة وزيوت المطابخ عمودياً بعيداً عن السطح وتتحمل مقاومة الفلاتر والهود.",
          path: "/roof-fan/upblast-roof-fan"
        };
      } else if (mount === "roof" && env === "highstatic") {
        rec = {
          enTitle: "Centrifugal Roof Fan (RC-A)",
          arTitle: "مروحة سقفية طرد مركزي (RC-A)",
          enDesc: "Backward-curved centrifugal wheel maintains airflow through ducted rooftop risers.",
          arDesc: "ريشة طرد مركزي تحافظ على التدفق عند ربط المروحة بشبكة دكت.",
          path: "/roof-fan/centrifugal-roof-fan"
        };
      } else if (mount === "wall") {
        rec = {
          enTitle: env === "dust" ? "Wall Mounted Shutter Fan (Hammer)" : "Wall Exhaust Fan with Damper / KDK / TAT",
          arTitle: env === "dust" ? "مروحة جدارية بشتر ثقيل (Hammer)" : "مروحة جدارية مع مخمد / KDK / TAT",
          enDesc: "Direct wall discharge with gravity shutters that close against dust and backdrafts.",
          arDesc: "طرد جداري مباشر مع شتر تلقائي يمنع دخول الغبار عند الإيقاف.",
          path: env === "dust" ? "/wall-mounted-fan/wall-mounted-shutter-exhaust-fan" : "/wall-mounted-fan"
        };
      } else if (mount === "inline") {
        if (env === "smoke") {
          rec = {
            enTitle: "Tube Axial / Smoke Extraction Fan (VDO)",
            arTitle: "مروحة أنبوبية لسحب الدخان (VDO)",
            enDesc: "High-volume axial inline unit built for ducted smoke and heat extraction.",
            arDesc: "مروحة أنبوبية عالية التدفق لتطبيقات سحب الدخان والحرارة عبر الدكت.",
            path: "/inline-fan/vdo-axial-smoke-extraction-fan"
          };
        } else if (env === "highstatic") {
          rec = {
            enTitle: "Centrifugal Box Inline Fan (CHA)",
            arTitle: "مروحة صندوقية داخل الدكت (CHA)",
            enDesc: "Designed to overcome longer duct runs, acoustic bends, and branch dampers.",
            arDesc: "مصممة للتغلب على مقاومة الدكت الطويل والأكواع والفلاتر.",
            path: "/inline-fan/centrifugal-box-inline-fan"
          };
        } else {
          rec = {
            enTitle: "Circular Inline Duct Fan",
            arTitle: "مروحة دائرية داخل الدكت",
            enDesc: "Compact inline fan for washrooms, offices, and light commercial ductwork.",
            arDesc: "مروحة مدمجة داخل الدكت لدورات المياه والمكاتب والتطبيقات التجارية الخفيفة.",
            path: "/inline-fan"
          };
        }
      } else if (mount === "ceiling") {
        rec = {
          enTitle: env === "dust" ? "HVLS Industrial Ceiling Fan" : "Ceiling Cassette Exhaust Fan (KDK / TAT)",
          arTitle: env === "dust" ? "مروحة سقفية صناعية HVLS" : "مروحة شفط سقفية (KDK / TAT)",
          enDesc: env === "dust"
            ? "Large-diameter air circulation for high-bay warehouses and industrial facilities."
            : "Low-noise ceiling exhaust for washrooms, offices, and false-ceiling grids.",
          arDesc: env === "dust"
            ? "تدوير هواء واسع النطاق للمستودعات والمصانع ذات الأسقف المرتفعة."
            : "شفط سقفي هادئ لدورات المياه والمكاتب والأسقف المستعارة.",
          path: env === "dust" ? "/hvls-ceiling-fan" : "/ceiling-exhaust-fan"
        };
      } else if (mount === "industrial") {
        rec = {
          enTitle: "Industrial Centrifugal Blower (DE / CBA)",
          arTitle: "منفاخ طرد مركزي صناعي (DE / CBA)",
          enDesc: "High static pressure blower for industrial process exhaust and heavy ductwork.",
          arDesc: "منفاخ للضغوط الساكنة العالية في التطبيقات الصناعية والدكت الثقيل.",
          path: "/centrifugal-blower"
        };
      } else if (mount === "portable") {
        rec = {
          enTitle: "Portable Ventilator Blower / Drum Fan",
          arTitle: "منفاخ تهوية متنقل / مروحة برميل",
          enDesc: "Flexible-duct air purge and spot cooling for maintenance and confined spaces.",
          arDesc: "تهوية مرنة وسريعة لأعمال الصيانة والأماكن المغلقة.",
          path: "/portable-exhaust-fan"
        };
      }

      var powerNote =
        power === "3ph"
          ? lang === "ar"
            ? " — 380–400 فولت / 3 فاز / 60 هرتز"
            : " — 380–400V, 3-Phase, 60Hz"
          : lang === "ar"
          ? " — 220–240 فولت / 1 فاز / 60 هرتز"
          : " — 220–240V, 1-Phase, 60Hz";

      outTitle.textContent = (lang === "ar" ? rec.arTitle : rec.enTitle) + powerNote;
      outDesc.textContent = lang === "ar" ? rec.arDesc : rec.enDesc;
      outLink.href = BASE_URL + rec.path;
    }

    [mountEl, envEl, powerEl].forEach(function (el) {
      el.addEventListener("change", recommend);
    });
    recommend();
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupTabs();
    setupSizingCalculator();
    setupConverter();
    setupSelector();
  });
})();
