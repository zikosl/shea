type FeeInput = {
  feeType?: string | null
  feeRate?: number | null
  fixedFee?: number | null
}

export function calculatePartnerFee(subtotal: number, partner?: FeeInput | null) {
  const feeType = partner?.feeType ?? 'NONE'
  const feeRate = Number(partner?.feeRate ?? 0)
  const fixedFee = Number(partner?.fixedFee ?? 0)
  const percentageFee = feeType === 'PERCENTAGE' || feeType === 'MIXED'
    ? subtotal * Math.max(0, feeRate) / 100
    : 0
  const flatFee = feeType === 'FIXED' || feeType === 'MIXED'
    ? Math.max(0, fixedFee)
    : 0
  const partnerFee = Math.min(subtotal, Math.max(0, percentageFee + flatFee))

  return {
    subtotal,
    partnerGross: subtotal,
    partnerFee,
    partnerNet: Math.max(0, subtotal - partnerFee),
    partnerFeeType: feeType,
    partnerFeeRate: feeRate,
    partnerFixedFee: fixedFee,
  }
}
