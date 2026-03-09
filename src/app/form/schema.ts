import * as z from "zod"

export const formSchema = z.object({
    name: z.string().min(1, { message: "お名前を入力してください" }),

    // マイナンバー情報
    myNumber: z.string()
        .regex(/^\d{12}$/, { message: "ご自身のマイナンバーは12桁の半角数字で入力してください" }),
    myNumberConfirm: z.string()
        .min(1, { message: "確認のためもう一度入力してください" }),

    // 家族のマイナンバー
    familyMembers: z.array(z.object({
        name: z.string().min(1, { message: "ご家族のお名前を入力してください" }),
        relationship: z.string().min(1, { message: "続柄を入力してください" }),
        myNumber: z.string()
            .regex(/^\d{12}$/, { message: "ご家族のマイナンバーは12桁の半角数字で入力してください" }),
        myNumberConfirm: z.string()
            .min(1, { message: "確認入力は必須です" }),
    })).superRefine((members, ctx) => {
        // 家族それぞれの二重入力確認（不一致時にクリアさせるため、フィールドごとにエラーを付ける）
        members.forEach((member, index) => {
            if (member.myNumber !== member.myNumberConfirm) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "マイナンバーが一致しません",
                    path: [index, "myNumberConfirm"]
                })
            }
        })
    }),

    // 銀行口座情報
    bankCode: z.string().min(1, { message: "金融機関コードが必要です" }),
    bankName: z.string().min(1, { message: "金融機関名が必要です" }),
    branchCode: z.string().min(1, { message: "支店コードが必要です" }),
    branchName: z.string().min(1, { message: "支店名が必要です" }),
    accountType: z.enum(["普通", "当座", "貯蓄"]),
    accountNumber: z.string()
        .regex(/^\d{6,7}$/, { message: "口座番号は6桁または7桁の半角数字で入力してください" }),
    accountName: z.string().min(1, { message: "口座名義を入力してください" }),
})
    .refine((data) => data.myNumber === data.myNumberConfirm, {
        message: "本人のマイナンバーが一致しません",
        path: ["myNumberConfirm"]
    })

export type FormValues = z.infer<typeof formSchema>
