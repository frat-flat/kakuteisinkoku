function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getActiveSheet();

        // ----------------------------------------------------
        // HELPER: Address Concatenation
        // ----------------------------------------------------
        function formatAddress(pref, city, bldg) {
            // If pref/city are [SKIPPED], treat them as null for concatenation
            // But if one is SKIPPED and other is not? Unlikely.
            // If pref is SKIPPED, then Address is Hidden.
            if (pref === '[SKIPPED]') return '[SKIPPED]';
            if (!pref && !city) return '';
            return (pref || '') + (city || '') + (bldg ? ' ' + bldg : '');
        }

        // ----------------------------------------------------
        // HELPER: Resolve Value
        // ----------------------------------------------------
        // Rules:
        // [SKIPPED] -> '-'
        // undefined/null/'' -> '未入力'
        // Other -> val
        function resolve(val) {
            if (val === '[SKIPPED]') return '-';
            if (val === undefined || val === null || val === '') return '未入力';
            return String(val);
        }

        // ----------------------------------------------------
        // COLUMN MAPPING (A to CE)
        // ----------------------------------------------------

        const ROW_DATA = [];

        // A: 送信日時
        ROW_DATA.push(new Date());

        // B: 氏名
        ROW_DATA.push(resolve(data.fullName));

        // C: フリガナ
        ROW_DATA.push(resolve(data.fullNameKana));

        // D: 生年月日
        ROW_DATA.push(resolve(data.dob));

        // E: 郵便番号
        ROW_DATA.push(resolve(data.zipCode));

        // F: 住所 (Combined)
        ROW_DATA.push(resolve(formatAddress(data.prefecture, data.address1, data.address2)));

        // G: 電話番号
        ROW_DATA.push(resolve(data.phone));

        // H: メールアドレス
        ROW_DATA.push(resolve(data.email));

        // I: 収入の種類
        const INCOME_MAP = { '1': '本案件の所得のみ', '2': '給与所得あり', '3': '事業所得あり' };
        // If data.incomeType is SKIPPED, lookup returns undefined? No, we check resolve logic.
        // If Skipped, we want '-'.
        // So we should map first only if not skipped.
        let incomeVal = data.incomeType;
        if (incomeVal !== '[SKIPPED]' && INCOME_MAP[incomeVal]) {
            incomeVal = INCOME_MAP[incomeVal];
        }
        ROW_DATA.push(resolve(incomeVal));

        // J: 源泉徴収票（ファイル）
        ROW_DATA.push(resolve(data.withholdingSlip));

        // K: 青色申告
        ROW_DATA.push(resolve(data.blueReturn));

        // L: 過去の申告状況
        ROW_DATA.push(resolve(data.pastFiling));

        // M: e-Tax ID
        ROW_DATA.push(resolve(data.etaxId));

        // N: e-Tax パスワード
        ROW_DATA.push(resolve(data.etaxPassword));

        // O: 世帯主との続柄
        ROW_DATA.push(resolve(data.headRelation));

        // P: 婚姻状況
        ROW_DATA.push(resolve(data.maritalStatus));

        // Q: 配偶者氏名
        ROW_DATA.push(resolve(data.spouseName));

        // R: 配偶者生年月日
        ROW_DATA.push(resolve(data.spouseDob));

        // S: 配偶者障害区分
        ROW_DATA.push(resolve(data.spouseDisability));

        // T: 配偶者同居区分
        ROW_DATA.push(resolve(data.spouseLiveTogether));

        // U: 配偶者扶養有無
        ROW_DATA.push(resolve(data.spouseAsDependent));

        // V: 扶養親族有無
        ROW_DATA.push(resolve(data.hasDependents));

        // W: 扶養親族人数
        ROW_DATA.push(resolve(data.dependentCount));

        // X: 医療費控除（適用）
        ROW_DATA.push(resolve(data.isMedicalDeduction));

        // Y: 医療費（金額）
        ROW_DATA.push(resolve(data.medicalExpenses));

        // Z: 医療費通知の有無
        ROW_DATA.push(resolve(data.medicalNotice));

        // AA: 医療費領収書（ファイル）
        ROW_DATA.push(resolve(data.medicalFile));

        // AB: ふるさと納税（適用）
        ROW_DATA.push(resolve(data.isFurusatoDeduction));

        // AC: 寄附先数
        ROW_DATA.push(resolve(data.furusatoCount));

        // AD: ワンストップ特例
        ROW_DATA.push(resolve(data.onestop));

        // AE: 寄附金受領証明書（ファイル）
        ROW_DATA.push(resolve(data.furusatoFile));

        // AF: 生命保険料控除（適用）
        ROW_DATA.push(resolve(data.isLifeInsDeduction));

        // AG: 生命保険料控除証明書（ファイル）
        ROW_DATA.push(resolve(data.lifeInsFile));

        // AH: 地震保険料控除（適用）
        ROW_DATA.push(resolve(data.isEarthquakeDeduction));

        // AI: 地震保険料控除証明書（ファイル）
        ROW_DATA.push(resolve(data.earthquakeFile));

        // AJ: iDeCo・小規模企業共済（適用）
        ROW_DATA.push(resolve(data.isIdecoDeduction));

        // AK: 掛金払込証明書（ファイル）
        ROW_DATA.push(resolve(data.idecoFile));

        // AL: 住宅ローン控除（適用）
        ROW_DATA.push(resolve(data.isHousingDeduction));

        // AM: 年末残高証明書（ファイル）
        ROW_DATA.push(resolve(data.housingFile));

        // AN: 障害者控除（適用）
        ROW_DATA.push(resolve(data.isHandicapDeduction));

        // AO: その他控除（適用）
        ROW_DATA.push(resolve(data.isOtherDeduction));

        // AP: その他詳細
        ROW_DATA.push(resolve(data.otherDeductionDetail));

        // AQ: 銀行口座種別
        ROW_DATA.push(resolve(data.accountType));

        // AR: 銀行名
        ROW_DATA.push(resolve(data.bankName));

        // AS: 支店名
        ROW_DATA.push(resolve(data.branchName));

        // AT: 口座番号
        ROW_DATA.push(resolve(data.accountNumber));

        // AU: 口座名義
        ROW_DATA.push(resolve(data.accountHolder));

        // AV: 申告・還付方法
        ROW_DATA.push(resolve(data.taxMethod));

        // --- Dependents Loop (AW to CE) ---
        for (let i = 1; i <= 5; i++) {
            ROW_DATA.push(resolve(data[`depName_${i}`]));
            ROW_DATA.push(resolve(data[`depKana_${i}`]));
            ROW_DATA.push(resolve(data[`depRel_${i}`]));
            ROW_DATA.push(resolve(data[`depDob_${i}`]));
            ROW_DATA.push(resolve(data[`depIncome_${i}`]));
            ROW_DATA.push(resolve(data[`depDisability_${i}`]));
            ROW_DATA.push(resolve(data[`depLiveCheck_${i}`]));
        }

        // ----------------------------------------------------
        // FINALIZATION
        // ----------------------------------------------------

        // ROW_DATA already formatted via resolve()

        sheet.appendRow(ROW_DATA);

        return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    sheet.clear();
}
