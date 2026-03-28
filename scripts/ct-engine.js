/**
 * Shared CT math (same as operator guide). Depends on window.CT_TABLES from ct-tables.js.
 * Exposes window.CT_ENGINE.runCtFromInputs(values) for live dashboards.
 */
(function () {
  "use strict";

  function ceiling(x, s) {
    if (s <= 0) return x;
    return s * Math.ceil(x / s - 1e-12);
  }

  function floorExcel(x, s) {
    return s * Math.floor(x / s + 1e-12);
  }

  function vlookupApprox(lookup, pairs) {
    var pick = pairs[0][1];
    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i][0] <= lookup) pick = pairs[i][1];
      else break;
    }
    return pick;
  }

  function snapPhBlock(blocks, iceil) {
    var ph = iceil;
    if (ph < 7) ph = 7;
    if (ph > 9) ph = 9;
    var best = blocks[0];
    var dmin = 99;
    for (var b = 0; b < blocks.length; b++) {
      var d = Math.abs(blocks[b].ph - ph);
      if (d < dmin) {
        dmin = d;
        best = blocks[b];
      }
    }
    return best;
  }

  function giardiaK(blocks, Kround, Iceil) {
    var ti = 0;
    var block = snapPhBlock(blocks, Iceil);
    var rows = block.rows;
    var pick = rows[0];
    for (var r = 0; r < rows.length; r++) {
      if (rows[r].cl <= Kround) pick = rows[r];
      else break;
    }
    return pick.k[ti];
  }

  function virusK(table, M) {
    var pairs = table.map(function (r) {
      return [r[0], r[1]];
    });
    return vlookupApprox(M, pairs);
  }

  function computeSegment(args) {
    var C = args.C,
      D = args.D,
      F = args.F,
      H = args.H,
      J = args.J,
      L = args.L,
      E11 = args.E11;
    var E = C > 0 && D > 0 ? (C / D) * 1000 / 60 : 0;
    var G = E * F;
    var Iceil = ceiling(H, 0.5);
    var Kround = J < 0 ? 0 : ceiling(J, 0.2);
    var Mband = L < 5 ? 0.5 : floorExcel(L, 5);
    var blocks = window.CT_TABLES.giardia_blocks;
    var N = giardiaK(blocks, Kround, Iceil);
    var O = N * J * G;
    var P =
      J === 0
        ? 0
        : (J * G) /
          (0.2828 * Math.pow(H, 2.69) * Math.pow(J, 0.15) * Math.pow(0.933, L - 5));
    var Q = Math.max(O, P);
    var R = Kround === 0 ? 0 : virusK(window.CT_TABLES.virus_k, Mband);
    var S = R * J * G;
    var T = J === 0 ? 0 : (J * G * Math.exp(0.071 * Mband) - 0.42) / 2.94;
    var U = Math.max(S, T);
    return {
      C: C,
      D: D,
      E: E,
      F: F,
      G: G,
      H: H,
      I: Iceil,
      J: J,
      K: Kround,
      L: L,
      M: Mband,
      N: N,
      O: O,
      P: P,
      Q: Q,
      R: R,
      S: S,
      T: T,
      U: U,
      JG: J * G,
    };
  }

  function fmt(n, d) {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(d != null ? d : 3);
  }

  function capLogG(x) {
    if (x > 3) return "> 3";
    return fmt(x, 4);
  }
  function capLogV(x) {
    if (x > 4) return "> 4";
    return fmt(x, 4);
  }

  /**
   * @param {Record<string, number>} v - calculator field ids → numeric values (same as guide inputs)
   */
  function runCtFromInputs(v) {
    if (!window.CT_TABLES || !window.CT_TABLES.giardia_blocks) {
      return null;
    }
    var I23 = +v.I23,
      I24 = +v.I24,
      I25 = +v.I25,
      TADD = +v.TADD,
      W7 = +v.W7,
      W16 = +v.W16,
      Y7 = +v.Y7,
      P11 = +v.P11,
      M13 = +v.M13,
      M11 = +v.M11,
      E11 = +v.E11,
      J9 = +v.J9,
      L7 = +v.L7,
      B14 = +v.B14,
      B11 = +v.B11,
      E14 = +v.E14,
      P20 = +v.P20,
      P21 = +v.P21;

    var C8 = (I23 * W7) / 100;
    var D8 = Math.max(Y7, P11);
    var s8 = computeSegment({ C: C8, D: D8, F: W16, H: M13, J: M11, L: E11, E11: E11 });

    var C9 = I24;
    var D9 = P11;
    var s9 = computeSegment({ C: C9, D: D9, F: 1, H: M13, J: M11, L: E11, E11: E11 });

    var C10 = (I25 * L7) / 100 + TADD;
    var D10 = Math.max(P11, B14);
    var s10 = computeSegment({ C: C10, D: D10, F: J9, H: E14, J: B11, L: E11, E11: E11 });

    var C24 = s8.Q + s9.Q + s10.Q;
    var D24 = s8.U + s9.U + s10.U;
    var C26 = s8.JG + s9.JG + s10.JG;
    var D26 = C26;
    var C27 = C24 !== 0 ? (C26 * P20) / C24 : NaN;
    var D27 = D24 !== 0 ? (D26 * P21) / D24 : NaN;

    var names = ["Clearwell", "Pipe (clearwell → tower)", "Elevated tank"];
    var segs = [s8, s9, s10];

    return {
      C24: C24,
      D24: D24,
      C26: C26,
      D26: D26,
      C27: C27,
      D27: D27,
      P20: P20,
      P21: P21,
      segs: segs,
      names: names,
      fmt: fmt,
      capLogG: capLogG,
      capLogV: capLogV,
      computeSegment: computeSegment,
    };
  }

  window.CT_ENGINE = {
    runCtFromInputs: runCtFromInputs,
    computeSegment: computeSegment,
    fmt: fmt,
    capLogG: capLogG,
    capLogV: capLogV,
  };
})();
