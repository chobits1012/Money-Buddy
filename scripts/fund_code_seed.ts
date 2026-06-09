/**
 * MoneyDJ fundCode 種子對照表（symbol → fundCode）
 * 執行 scripts/apply_fund_codes.ts 會以 API + 名稱比對驗證後寫入 funds.json
 */
export const FUND_CODE_SEED: Record<string, { fundCode: string; navScope?: 'domestic' | 'offshore' }> = {
    // ── 使用者優先 4 檔（已 API 驗證）──
    'ALLIANZ-TW-BIG': { fundCode: 'ACDD01' },
    'ALLIANZ-TW-TECH': { fundCode: 'ACDD04' },
    'ALLIANZ-AI': { fundCode: 'TLH43', navScope: 'offshore' },
    'UNI-PENTIUM': { fundCode: 'ACPS10' },
    'ALLIANZ-GLOBAL-ESG-EUR': { fundCode: 'TLZ58', navScope: 'offshore' },

    // ── 安聯 ──
    'ALLIANZ-TW-HYD': { fundCode: 'ACDD158' },
    'ALLIANZ-INCOME': { fundCode: 'ACDD74' },
    'ALLIANZ-EU': { fundCode: 'TLZA2', navScope: 'offshore' },
    'ALLIANZ-GLOBAL-TECH': { fundCode: 'TLZM0', navScope: 'offshore' },
    'ALLIANZ-JP': { fundCode: 'TLZ94', navScope: 'offshore' },
    'ALLIANZ-US-TECH': { fundCode: 'TLZM0', navScope: 'offshore' },
    'YUANTA-LEADER': { fundCode: 'ACYT153' },
    'YUANTA-FIN': { fundCode: 'ACYT157' },
    'YUANTA-LOWVOL': { fundCode: 'ACYT158' },

    // ── 元大 ──
    'YUANTA-TW50': { fundCode: 'AC0050' },
    'YUANTA-TW50-EX': { fundCode: 'AC0050' },
    'YUANTA-HYD': { fundCode: 'AC0056' },
    'YUANTA-SP500': { fundCode: 'ACYT80' },
    'YUANTA-GLOBAL-AI': { fundCode: 'ACYT146' },
    'YUANTA-NDX': { fundCode: 'ACYT214' },

    // ── 國泰 ──
    'CATHAY-TW-HYD': { fundCode: 'ACCY149' },
    'CATHAY-TECH-BIO': { fundCode: 'ACCY07' },
    'CATHAY-SMCAP': { fundCode: 'ACCY03' },
    'CATHAY-ESG-HYD': { fundCode: 'ACCY150' },
    'CATHAY-DOW': { fundCode: 'ACCY151', navScope: 'offshore' },

    // ── 群益 ──
    'CAPITAL-TW-HYD': { fundCode: 'ACCA278' },
    'CAPITAL-SMCAP': { fundCode: 'AC0023' },
    'CAPITAL-DONG': { fundCode: 'ACCP03' },
    'CAPITAL-INDIA': { fundCode: 'ACCP04', navScope: 'offshore' },
    'CAPITAL-NDX': { fundCode: 'ACCP05', navScope: 'offshore' },

    // ── 富邦 ──
    'FUBON-SEMI': { fundCode: 'ACFP132' },
    'FUBON-TECH': { fundCode: 'AC0052' },
    'FUBON-NDX': { fundCode: 'ACJS02', navScope: 'offshore' },
    'FUBON-HSI': { fundCode: 'ACJS03', navScope: 'offshore' },
    'FUBON-ETF-LINK': { fundCode: 'ACJS04' },

    // ── 復華 ──
    'FH-TW-TECH-HYD': { fundCode: 'ACFH113' },
    'FH-TW-MAIN': { fundCode: 'ACFH02' },
    'FH-SOX': { fundCode: 'ACFH03', navScope: 'offshore' },
    'FH-LEVER': { fundCode: 'ACFH04' },
    'FH-GROWTH': { fundCode: 'ACFH05' },

    // ── 統一 ──
    'UNI-BLACK': { fundCode: 'ACPS02' },
    'UNI-ALL-WEATHER': { fundCode: 'ACPS01' },
    'UNI-US-PLUS': { fundCode: 'ACPS08', navScope: 'offshore' },

    // ── 中信 ──
    'CTBC-TW-HYD': { fundCode: 'ACCT01' },
    'CTBC-SMALL': { fundCode: 'ACCT02' },
    'CTBC-JP': { fundCode: 'ACCT03', navScope: 'offshore' },

    // ── 野村 ──
    'NOMURA-TW-HYD': { fundCode: 'ACKH29' },
    'NOMURA-TW50': { fundCode: 'ACNO02' },
    'NOMURA-JP': { fundCode: 'ACNO03', navScope: 'offshore' },

    // ── 瀚亞 ──
    'EASTSPRING-TW-TECH': { fundCode: 'ACEA01' },
    'EASTSPRING-FI': { fundCode: 'ACEA02', navScope: 'offshore' },
    'EASTSPRING-US-TECH': { fundCode: 'ACEA03', navScope: 'offshore' },

    // ── 柏瑞 ──
    'PICTET-TW': { fundCode: 'ACPB01' },
    'PICTET-ESG': { fundCode: 'ACPB02', navScope: 'offshore' },

    // ── 摩根 ──
    'JPM-PAC': { fundCode: 'JFZ04', navScope: 'offshore' },
    'JPM-EM': { fundCode: 'JFZ05', navScope: 'offshore' },

    // ── 富達 / 富蘭克林 ──
    'FID-US-GROWTH': { fundCode: 'ACFD01', navScope: 'offshore' },
    'FTFT-HITECH': { fundCode: 'ACFT01', navScope: 'offshore' },

    // ── 聯博 ──
    'AB-GHY': { fundCode: 'ACAB01', navScope: 'offshore' },
    'AB-US-INCOME': { fundCode: 'ACAB02', navScope: 'offshore' },

    // ── 凱基 / 台新 / 永豐 / 第一金 / 新光 / 兆豐 ──
    'KGI-VIP': { fundCode: 'ACKG01' },
    'KGI-HYD30': { fundCode: 'ACKG02' },
    'TAISHIN-2000': { fundCode: 'ACTS01' },
    'TAISHIN-INDIA': { fundCode: 'ACTS02', navScope: 'offshore' },
    'SINOPAC-TW-HYD': { fundCode: 'ACSP01' },
    'SINOPAC-SP500': { fundCode: 'ACSP02', navScope: 'offshore' },
    'FIRST-SAT': { fundCode: 'ACFC01' },
    'FIRST-US100': { fundCode: 'ACFC02', navScope: 'offshore' },
    'SKIS-INNO': { fundCode: 'ACSK01' },
    'MEGA-VIP': { fundCode: 'ACMG01' },

    // ── 其他境外 ──
    'NEUBERGER-MA': { fundCode: 'ACNB01', navScope: 'offshore' },
    'HSBC-ASIA-HYD': { fundCode: 'ACHB01', navScope: 'offshore' },
    'UBS-CHINA': { fundCode: 'ACUB01', navScope: 'offshore' },
    'DEUTSCHE-EM': { fundCode: 'ACDB01', navScope: 'offshore' },
    'BLACKROCK-WORLD': { fundCode: 'SHZ71', navScope: 'offshore' },
    'SCHRODER-ASIA': { fundCode: 'ACSC01', navScope: 'offshore' },
    'MANULIFE-BAL': { fundCode: 'ACML01', navScope: 'offshore' },
    'BNP-EU': { fundCode: 'ACBN01', navScope: 'offshore' },
    'AMUNDI-US': { fundCode: 'ACAM01', navScope: 'offshore' },
    'PGIM-HEALTH': { fundCode: 'ACPG01', navScope: 'offshore' },
    'INVESCO-TECH': { fundCode: 'ACIV01', navScope: 'offshore' },
};
