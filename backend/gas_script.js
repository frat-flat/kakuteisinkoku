function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getActiveSheet();

        // ----------------------------------------------------
        // CONSTANT: Column Mappings (Order Matters!)
        // These keys must match the 'name' attributes sent from frontend
        // ----------------------------------------------------
        const COLUMNS = [
            { key: 'fullName', label: '氏名' },
            { key: 'fullNameKana', label: '氏名（カナ）' },
            { key: 'incomeType', label: '収入形態' },
            { key: 'email', label: 'メールアドレス' },
            { key: 'phone', label: '電話番号' },

            { key: 'zipCode', label: '現住所郵便番号' },
            { key: 'prefecture', label: '現住所都道府県' },
            { key: 'address1', label: '現住所市区町村' },
            { key: 'address2', label: '現住所建物名' },

            { key: 'addressJan1', label: '1/1住所区分' },
            { key: 'jan1Zip', label: '1/1郵便番号' },
            { key: 'jan1Pref', label: '1/1都道府県' },
            { key: 'jan1City', label: '1/1市区町村' },
            { key: 'jan1Building', label: '1/1建物名' },

            { key: 'dob', label: '生年月日' },
            { key: 'myNumber', label: 'マイナンバー' },
            { key: 'blueReturn', label: '青色申告承認' },
            { key: 'pastFiling', label: '過去の申告有無' },
            { key: 'etaxId', label: '利用者識別番号' },
            { key: 'etaxPassword', label: 'e-Taxパスワード' },

            { key: 'isHead', label: '世帯主区分' },
            { key: 'headRelation', label: '世帯主との続柄' },
            { key: 'maritalStatus', label: '婚姻状況' },

            { key: 'spouseName', label: '配偶者氏名' },
            { key: 'spouseKana', label: '配偶者カナ' },
            { key: 'spouseDob', label: '配偶者生年月日' },
            { key: 'spouseMyNumber', label: '配偶者マイナンバー' },
            { key: 'spouseIncome', label: '配偶者所得' },
            { key: 'spouseDisability', label: '配偶者障害' },
            { key: 'spouseAsDependent', label: '配偶者扶養有無' },
            { key: 'spouseLiveTogether', label: '配偶者同居区分' },
            { key: 'spouseZip', label: '配偶者郵便番号' },
            { key: 'spousePref', label: '配偶者都道府県' },
            { key: 'spouseCity', label: '配偶者市区町村' },
            { key: 'spouseBuilding', label: '配偶者建物名' },

            { key: 'hasDependents', label: '扶養親族有無' },
            { key: 'dependentCount', label: '扶養親族人数' },
            { key: '_dependentsSummary', label: '扶養親族詳細' },

            { key: 'hasChildTogether', label: '生計一の子(ひとり親判定)' },
            { key: 'supportChild', label: '子扶養予定(ひとり親判定)' },
            { key: 'incomeUnder5m', label: '所得500万以下(ひとり親判定)' },

            { key: 'companyCount', label: '勤務先社数' },
            { key: 'withholdingSlip', label: '源泉徴収票' },
            { key: 'yearEndAdj', label: '年末調整' },

            { key: 'deductions', label: '選択した控除' },
            { key: 'medicalExpenses', label: '医療費概算' },
            { key: 'medicalNotice', label: '医療費通知' },
            { key: 'furusatoCount', label: 'ふるさと納税数' },
            { key: 'onestop', label: 'ワンストップ' },
            { key: 'otherDeductionDetail', label: 'その他控除詳細' },

            { key: 'bankName', label: '銀行名' },
            { key: 'branchName', label: '支店名' },
            { key: 'accountType', label: '預金種別' },
            { key: 'accountNumber', label: '口座番号' },
            { key: 'accountHolder', label: '口座名義' },
            { key: 'taxMethod', label: '申告方法' }
        ];

        // ----------------------------------------------------
        // SETUP: Set Header Row if Empty
        // ----------------------------------------------------
        if (sheet.getLastRow() === 0) {
            const headers = COLUMNS.map(c => c.label);
            // Add timestamp to first column
            headers.unshift('タイムスタンプ');
            sheet.appendRow(headers);
        }

        // ----------------------------------------------------
        // PROCESS: Build Row Data
        // ----------------------------------------------------
        const row = [new Date()]; // First col is timestamp

        COLUMNS.forEach(col => {
            let val = data[col.key];

            // FORMATTING LOGIC
            if (val === '[SKIPPED]') {
                val = '-'; // Hidden fields (Half-width hyphen)
            } else if (val === undefined || val === null || val === '') {
                val = '入力なし'; // Visible but empty
            }

            // Safety: Force string for values like '0'
            row.push(String(val));
        });

        // Append Logic
        sheet.appendRow(row);

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
    // Simply clearing and setting header for manual setup
    sheet.clear();
}
