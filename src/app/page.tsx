"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { useState } from "react"

export default function ConsentPage() {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget

    // スクロール位置 + 表示領域の高さが、全体の高さとほぼ等しいか判定
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 5) {
      setIsScrolledToBottom(true)
    }
  }
  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg border-neutral-200">
        <CardHeader className="space-y-2 bg-white pb-6 rounded-t-xl">
          <CardTitle className="text-2xl font-semibold text-center text-neutral-900">
            個人情報の取り扱いに関する同意
          </CardTitle>
          <CardDescription className="text-center text-neutral-500 space-y-2">
            <p>本フォームは、前回ご提出いただいた確定申告フォームにてデータが確認できなかった場合にご入力いただく補足フォームです。</p>
            <p>お手続きを進める前に、以下の内容をご確認およびご同意をお願いいたします。</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ScrollArea
            className="h-[300px] w-full rounded-md border p-6 bg-white shadow-inner"
            onScrollCapture={handleScroll}
          >
            <div className="space-y-6 text-sm text-neutral-700 leading-relaxed pb-4">
              <section>
                <h3 className="font-semibold text-base mb-2 text-neutral-900">1. 利用目的</h3>
                <p>
                  ご提供いただいたマイナンバー（個人番号、および家族の個人番号）、銀行口座情報を含む個人情報は、
                  確定申告（およびそれに伴う法定調書の作成・提出事務）のために<b>のみ</b>利用し、
                  その他の目的には一切利用いたしません。
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2 text-neutral-900">2. 第三者への提供</h3>
                <p>
                  法令等に定めのある場合を除き、ご本人の事前の同意なく第三者に対する情報の提供は行いません。
                  ただし、利用目的の達成の範囲内で、適切な監督のもとに業務委託先へ情報を提供する場合があります。
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2 text-neutral-900">3. 情報の適正管理</h3>
                <p>
                  取得したマイナンバー等の特定個人情報は、関係法令やガイドラインに則り、漏洩、滅失または毀損の防止のため
                  必要かつ適切な安全管理措置を講じます。また、法定保存期間が経過した後は、速やかにかつ適正に廃棄・削除いたします。
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-2 text-neutral-900">4. 提供の任意性とその結果</h3>
                <p>
                  本フォームへの個人情報・マイナンバーの提供は任意です。ただし、法令に基づく手続に必要な情報であるため、
                  ご提供いただけない場合は、各種お支払いや法定調書の提出手続き等に支障が生じる可能性がございます。
                </p>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-6 pb-8">
          <Button
            className="w-full sm:w-auto min-w-[200px] bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300"
            disabled={!isScrolledToBottom}
            asChild={isScrolledToBottom}
          >
            {isScrolledToBottom ? (
              <Link href="/form">同意して進む</Link>
            ) : (
              <span>最後までお読みください</span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
