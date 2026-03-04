import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function SuccessPage() {
    return (
        <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center py-8 shadow-sm">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl">送信が完了しました</CardTitle>
                    <CardDescription className="text-neutral-600 mt-2">
                        情報のご提供ありがとうございました。<br />
                        このウィンドウを閉じてください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* 必要に応じてボタン等を追加 */}
                </CardContent>
            </Card>
        </main>
    )
}
