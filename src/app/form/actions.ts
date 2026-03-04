"use server"

import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { formSchema } from "./schema"

// Prisma 7+ Postgres Adapter Configuration for Vercel Serverless
let prisma: PrismaClient

export async function submitForm(data: z.infer<typeof formSchema>) {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error("Vercelに『DATABASE_URL』環境変数が正しく認識されていません。設定画面で追加されていること、および追加後の「Redeploy」が完了していることをご確認ください。")
        }

        if (!prisma) {
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            })
            const adapter = new PrismaPg(pool)
            prisma = new PrismaClient({ adapter })
        }
        // フォームデータの検証
        const validatedData = formSchema.parse(data)

        // 新規Entityを作成しつつ関連情報を一度に保存
        const newEntity = await prisma.entity.create({
            data: {
                status: "ACTIVE",
                basicHistories: {
                    create: {
                        registeredName: validatedData.name,
                        myNumber: validatedData.myNumber,
                    }
                },
                // 家族情報（設定されていれば）
                familyMembers: {
                    create: validatedData.familyMembers?.map(fm => ({
                        familyName: fm.name,
                        relationship: fm.relationship,
                        myNumber: fm.myNumber
                    })) || []
                },
                // 銀行口座情報
                bankAccounts: {
                    create: {
                        bankCode: validatedData.bankCode,
                        bankName: validatedData.bankName,
                        branchCode: validatedData.branchCode,
                        branchName: validatedData.branchName,
                        accountType: validatedData.accountType,
                        accountNumber: validatedData.accountNumber,
                        accountName: validatedData.accountName
                    }
                }
            }
        })

        // 2. Google Apps Script (GAS) へのデータ送信
        const gasUrl = process.env.GAS_WEBHOOK_URL
        if (gasUrl) {
            try {
                // スプレッドシート側のGASの構成に合わせ、整形済みのデータを送信
                // ここでは validatedData をそのまま送りますが、必要に応じて変換してください
                const gasRes = await fetch(gasUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(validatedData)
                })

                if (!gasRes.ok) {
                    console.error("GAS responded with error:", gasRes.status, await gasRes.text())
                } else {
                    console.log("GASへの送信が完了しました:", await gasRes.text())
                }
            } catch (gasError) {
                // DBには保存できたが、GAS送信に失敗した場合のログ
                console.error("GASへの送信エラー:", gasError)
                // ここでエラーをスローするかどうかは要件次第（今回はスルーしてDBへの保存を優先）
            }
        }

        return {
            success: true,
            entityId: newEntity.id
        }
    } catch (error) {
        console.error("Form submission error:", error)
        if (error instanceof z.ZodError) {
            return { success: false, message: "入力内容に誤りがあります" }
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, message: `サーバーエラー: ${errorMessage}` }
    }
}
