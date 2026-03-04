"use client"

import { useState, useCallback, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { formSchema, FormValues } from "./schema"
import { submitForm } from "./actions"
import { useBankApi } from "@/hooks/useBankApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Search, Loader2, Eye } from "lucide-react"

export default function FormPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeInput, setActiveInput] = useState<string | null>(null)
    const [showMyNumber, setShowMyNumber] = useState(false)
    const [showFamilyNumber, setShowFamilyNumber] = useState<{ [key: number]: boolean }>({})
    const [showFamilyNumberConfirm, setShowFamilyNumberConfirm] = useState<{ [key: number]: boolean }>({})
    const [showMyNumberConfirm, setShowMyNumberConfirm] = useState(false)

    const {
        banks, branches, isLoadingBanks, isLoadingBranches,
        searchBanks, searchBranches, getBankByCode, getBranchByCode, clearBanks, clearBranches
    } = useBankApi()

    // フォーム設定
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            myNumber: "",
            myNumberConfirm: "",
            familyMembers: [],
            bankCode: "",
            bankName: "",
            branchCode: "",
            branchName: "",
            accountType: undefined,
            accountNumber: "",
            accountName: "",
        },
        mode: "onBlur"
    })

    const { control, register, handleSubmit, formState: { errors }, watch, setValue, trigger } = form
    const { fields, append, remove } = useFieldArray({
        control,
        name: "familyMembers"
    })

    // Watch for dependent fields
    const [bankCodeWatch, bankNameInputWatch, branchCodeWatch, branchNameInputWatch, myNumberWatch, myNumberConfirmWatch] = watch([
        "bankCode", "bankName", "branchCode", "branchName", "myNumber", "myNumberConfirm"
    ])

    const isMyNumberMismatch = myNumberWatch && myNumberConfirmWatch && myNumberWatch !== myNumberConfirmWatch;

    // ============================================
    // 銀行のサジェスト処理・相互補完処理
    // ============================================
    // 銀行名の入力でサジェスト検索
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeInput === 'bankName' && bankNameInputWatch) {
                searchBanks(bankNameInputWatch)
            } else {
                clearBanks()
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [bankNameInputWatch, activeInput, searchBanks, clearBanks])

    // 銀行コードの入力で銀行名を取得して補完
    useEffect(() => {
        if (activeInput === 'bankCode' && bankCodeWatch?.length === 4) {
            getBankByCode(bankCodeWatch).then(bank => {
                if (bank) {
                    // サジェスト選択時は activeInput を null にして意図しない上書きを防ぐ
                    setActiveInput(null)
                    setValue("bankName", bank.name, { shouldValidate: true })
                    clearBanks()
                }
            })
        }
    }, [bankCodeWatch, activeInput, getBankByCode, setValue, clearBanks])

    // 支店名の入力で検索
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeInput === 'branchName' && branchNameInputWatch && bankCodeWatch) {
                searchBranches(bankCodeWatch, branchNameInputWatch)
            } else {
                clearBranches()
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [branchNameInputWatch, bankCodeWatch, activeInput, searchBranches, clearBranches])

    // 支店コードの入力で支店名を取得して補完
    useEffect(() => {
        if (activeInput === 'branchCode' && branchCodeWatch?.length === 3 && bankCodeWatch) {
            getBranchByCode(bankCodeWatch, branchCodeWatch).then(branch => {
                if (branch) {
                    setActiveInput(null)
                    setValue("branchName", branch.name, { shouldValidate: true })
                    clearBranches()
                }
            })
        }
    }, [branchCodeWatch, bankCodeWatch, activeInput, getBranchByCode, setValue, clearBranches])

    const selectBank = (bank: any) => {
        setActiveInput(null)
        setValue("bankCode", bank.code, { shouldValidate: true })
        setValue("bankName", bank.name, { shouldValidate: true })
        clearBanks()
    }

    const selectBranch = (branch: any) => {
        setActiveInput(null)
        setValue("branchCode", branch.code, { shouldValidate: true })
        setValue("branchName", branch.name, { shouldValidate: true })
        clearBranches()
    }


    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true)
        try {
            const res = await submitForm(data)
            console.log("Submission response:", res)
            if (res.success) {
                toast.success("情報が正常に送信されました。画面を遷移します。")
                // router.pushの代わりに確実なリダイレクトを行う
                window.location.href = "/form/success"
            } else {
                toast.error(res.message || "エラーが発生しました")
            }
        } catch (e) {
            console.error("Submit Error:", e)
            toast.error("通信エラーが発生しました: " + (e instanceof Error ? e.message : String(e)))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-neutral-900">確定申告再提出用フォーム</h1>
                <p className="text-neutral-600 mb-8">
                    必要事項を入力し、「送信する」ボタンを押してください。<br />
                    取得した個人情報は法定調書作成事務にのみ使用します。
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                    {/* ---- 基本情報 ---- */}
                    <Card>
                        <CardHeader className="bg-neutral-100 rounded-t-xl py-4">
                            <CardTitle className="text-lg">基本情報</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">お名前 <span className="text-red-500">*</span></Label>
                                <Input id="name" placeholder="山田 太郎" {...register("name")} />
                                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="myNumber">マイナンバー（個人番号） <span className="text-red-500">*</span></Label>
                                <div className="text-xs text-neutral-500 mb-1">※パスワード形式で保護されます（16桁の数字）</div>
                                <div className="relative">
                                    <Input
                                        id="myNumber"
                                        type={showMyNumber ? "text" : "password"}
                                        placeholder="1234567890123456"
                                        maxLength={16}
                                        {...register("myNumber")}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                                        onMouseDown={() => setShowMyNumber(true)}
                                        onMouseUp={() => setShowMyNumber(false)}
                                        onMouseLeave={() => setShowMyNumber(false)}
                                        onTouchStart={() => setShowMyNumber(true)}
                                        onTouchEnd={() => setShowMyNumber(false)}
                                    >
                                        <Eye className="h-5 w-5" />
                                    </button>
                                </div>
                                {errors.myNumber && <p className="text-sm text-red-500">{errors.myNumber.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="myNumberConfirm">マイナンバー（確認用） <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Input
                                        id="myNumberConfirm"
                                        type={showMyNumberConfirm ? "text" : "password"}
                                        placeholder="確認のためもう一度ご入力ください"
                                        maxLength={16}
                                        {...register("myNumberConfirm")}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                                        onMouseDown={() => setShowMyNumberConfirm(true)}
                                        onMouseUp={() => setShowMyNumberConfirm(false)}
                                        onMouseLeave={() => setShowMyNumberConfirm(false)}
                                        onTouchStart={() => setShowMyNumberConfirm(true)}
                                        onTouchEnd={() => setShowMyNumberConfirm(false)}
                                    >
                                        <Eye className="h-5 w-5" />
                                    </button>
                                </div>
                                {errors.myNumberConfirm && !isMyNumberMismatch ? (
                                    <p className="text-sm text-red-500">{errors.myNumberConfirm.message}</p>
                                ) : isMyNumberMismatch ? (
                                    <p className="text-sm text-red-500">本人のマイナンバーが一致しません</p>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ---- 家族のマイナンバー ---- */}
                    <Card>
                        <CardHeader className="bg-neutral-100 rounded-t-xl py-4 flex flex-row justify-between items-center">
                            <div>
                                <CardTitle className="text-lg">ご家族のマイナンバー（配偶者・扶養家族など）</CardTitle>
                                <CardDescription className="mt-1">
                                    扶養親族等の対象となるご家族がいる場合にご入力ください。
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6 mb-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-4 border border-neutral-200 rounded-lg space-y-4 bg-white shadow-sm relative">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => remove(index)}
                                        type="button"
                                    >
                                        削除
                                    </Button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>家族のお名前</Label>
                                            <Input placeholder="山田 花子" {...register(`familyMembers.${index}.name`)} />
                                            {errors.familyMembers?.[index]?.name && <p className="text-sm text-red-500">{errors.familyMembers[index]?.name?.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>続柄</Label>
                                            <Input placeholder="子、父、母など" {...register(`familyMembers.${index}.relationship`)} />
                                            {errors.familyMembers?.[index]?.relationship && <p className="text-sm text-red-500">{errors.familyMembers[index]?.relationship?.message}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>家族のマイナンバー</Label>
                                        <div className="relative">
                                            <Input
                                                type={showFamilyNumber[index] ? "text" : "password"}
                                                placeholder="1234567890123456"
                                                maxLength={16}
                                                {...register(`familyMembers.${index}.myNumber`)}
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                                                onMouseDown={() => setShowFamilyNumber(prev => ({ ...prev, [index]: true }))}
                                                onMouseUp={() => setShowFamilyNumber(prev => ({ ...prev, [index]: false }))}
                                                onMouseLeave={() => setShowFamilyNumber(prev => ({ ...prev, [index]: false }))}
                                                onTouchStart={() => setShowFamilyNumber(prev => ({ ...prev, [index]: true }))}
                                                onTouchEnd={() => setShowFamilyNumber(prev => ({ ...prev, [index]: false }))}
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        </div>
                                        {errors.familyMembers?.[index]?.myNumber && <p className="text-sm text-red-500">{errors.familyMembers[index]?.myNumber?.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>家族のマイナンバー（確認用）</Label>
                                        <div className="relative">
                                            <Input
                                                type={showFamilyNumberConfirm[index] ? "text" : "password"}
                                                placeholder="確認用"
                                                maxLength={16}
                                                {...register(`familyMembers.${index}.myNumberConfirm`)}
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                                                onMouseDown={() => setShowFamilyNumberConfirm(prev => ({ ...prev, [index]: true }))}
                                                onMouseUp={() => setShowFamilyNumberConfirm(prev => ({ ...prev, [index]: false }))}
                                                onMouseLeave={() => setShowFamilyNumberConfirm(prev => ({ ...prev, [index]: false }))}
                                                onTouchStart={() => setShowFamilyNumberConfirm(prev => ({ ...prev, [index]: true }))}
                                                onTouchEnd={() => setShowFamilyNumberConfirm(prev => ({ ...prev, [index]: false }))}
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        </div>
                                        {/* 確認エラーが発生した場合の表示 */}
                                        {errors.familyMembers?.[index]?.myNumberConfirm && <p className="text-sm text-red-500">{errors.familyMembers[index]?.myNumberConfirm?.message}</p>}
                                    </div>
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => append({ name: "", relationship: "", myNumber: "", myNumberConfirm: "" })}
                                className="w-full border-dashed"
                            >
                                ＋ 家族を追加する
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ---- 銀行口座情報 ---- */}
                    <Card>
                        <CardHeader className="bg-neutral-100 rounded-t-xl py-4">
                            <CardTitle className="text-lg">銀行口座情報</CardTitle>
                            <CardDescription>報酬や振込先となる口座情報をご記入ください</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 relative">
                                    <Label>金融機関名 <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            placeholder="銀行名を入力（例: 三菱UFJ）"
                                            {...register("bankName", {
                                                onChange: () => {
                                                    if (activeInput === 'bankName') setValue("bankCode", "")
                                                }
                                            })}
                                            onFocus={() => setActiveInput('bankName')}
                                        />
                                        {isLoadingBanks && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-neutral-400" />}
                                    </div>
                                    {/* サジェスト結果 */}
                                    {banks.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {banks.map((bank, i) => (
                                                <div
                                                    key={i}
                                                    className="px-4 py-2 hover:bg-neutral-100 cursor-pointer text-sm border-b last:border-0"
                                                    onClick={() => selectBank(bank)}
                                                >
                                                    <span className="font-semibold">{bank.name}</span> ({bank.code})
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {errors.bankName && <p className="text-sm text-red-500">{errors.bankName.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>金融機関コード</Label>
                                    <Input
                                        placeholder="自動反映 または 4桁のコードを入力"
                                        maxLength={4}
                                        {...register("bankCode", {
                                            onChange: () => {
                                                if (activeInput === 'bankCode') setValue("bankName", "")
                                            }
                                        })}
                                        onFocus={() => setActiveInput('bankCode')}
                                    />
                                    {errors.bankCode && <p className="text-sm text-red-500">{errors.bankCode.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 relative">
                                    <Label>支店名 <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            placeholder="金融機関選択後に支店を検索"
                                            disabled={!bankCodeWatch}
                                            {...register("branchName", {
                                                onChange: () => {
                                                    if (activeInput === 'branchName') setValue("branchCode", "")
                                                }
                                            })}
                                            onFocus={() => setActiveInput('branchName')}
                                        />
                                        {isLoadingBranches && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-neutral-400" />}
                                    </div>
                                    {/* 支店サジェスト */}
                                    {branches.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {branches.map((branch, i) => (
                                                <div
                                                    key={i}
                                                    className="px-4 py-2 hover:bg-neutral-100 cursor-pointer text-sm border-b last:border-0"
                                                    onClick={() => selectBranch(branch)}
                                                >
                                                    <span className="font-semibold">{branch.name}</span> ({branch.code})
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {errors.branchName && <p className="text-sm text-red-500">{errors.branchName.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>支店コード</Label>
                                    <Input
                                        placeholder="自動反映 または 3桁のコードを入力"
                                        maxLength={3}
                                        disabled={!bankCodeWatch}
                                        {...register("branchCode", {
                                            onChange: () => {
                                                if (activeInput === 'branchCode') setValue("branchName", "")
                                            }
                                        })}
                                        onFocus={() => setActiveInput('branchCode')}
                                    />
                                    {errors.branchCode && <p className="text-sm text-red-500">{errors.branchCode.message}</p>}
                                </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>口座種別 <span className="text-red-500">*</span></Label>
                                    <Select onValueChange={(val: any) => setValue("accountType", val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="選択してください" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="普通">普通</SelectItem>
                                            <SelectItem value="当座">当座</SelectItem>
                                            <SelectItem value="貯蓄">貯蓄</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.accountType && <p className="text-sm text-red-500">{errors.accountType.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>口座番号 (6〜7桁) <span className="text-red-500">*</span></Label>
                                    <Input
                                        maxLength={7}
                                        type="tel"
                                        placeholder="1234567"
                                        {...register("accountNumber")}
                                    />
                                    {errors.accountNumber && <p className="text-sm text-red-500">{errors.accountNumber.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>口座名義 (カタカナ) <span className="text-red-500">*</span></Label>
                                <Input placeholder="ヤマダ タロウ" {...register("accountName")} />
                                {errors.accountName && <p className="text-sm text-red-500">{errors.accountName.message}</p>}
                            </div>

                        </CardContent>
                    </Card>

                    <Button
                        type="submit"
                        className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 送信中...</>
                        ) : "送信する"}
                    </Button>

                </form>
            </div>
        </main >
    )
}
