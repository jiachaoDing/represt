export type ExerciseDictionaryEntry = {
  name: string
  aliases?: string[]
}

export const exerciseDictionary: ExerciseDictionaryEntry[] = [
  { name: '杠铃卧推', aliases: ['卧推', '胸推', 'barbell bench press', 'bbwp', 'wt'] },
  { name: '哑铃卧推', aliases: ['dumbbell bench press', 'ylwt', 'wt'] },
  { name: '上斜杠铃卧推', aliases: ['上斜卧推', 'sxwt'] },
  { name: '上斜哑铃卧推', aliases: ['上斜卧推', 'sxylwt'] },
  { name: '下斜杠铃卧推', aliases: ['下斜卧推', 'decline barbell bench press', 'xxglwt'] },
  { name: '下斜哑铃卧推', aliases: ['下斜卧推', 'decline dumbbell bench press', 'xxylwt'] },
  { name: '器械夹胸', aliases: ['夹胸', 'pec deck', 'qxjx'] },
  { name: '绳索夹胸', aliases: ['夹胸', 'cable fly', 'ssjx'] },
  { name: '双杠臂屈伸', aliases: ['臂屈伸', 'dips', 'sgbqs'] },
  { name: '俯卧撑', aliases: ['push up', 'fwc'] },
  { name: '负重俯卧撑', aliases: ['俯卧撑', 'weighted push up', 'fzfwc'] },
  { name: '引体向上', aliases: ['引体', 'pull up', 'ytxs'] },
  { name: '高位引体向上', aliases: ['宽握引体', 'wide grip pull up', 'gwytxs'] },
  { name: '反手引体向上', aliases: ['chin up', 'fshytxs'] },
  { name: '高位下拉', aliases: ['下拉', 'lat pulldown', 'gwxl'] },
  { name: '窄握高位下拉', aliases: ['窄握下拉', 'close grip lat pulldown', 'zwgwxl'] },
  { name: '杠铃划船', aliases: ['划船', 'barbell row', 'glhc'] },
  { name: '坐姿划船', aliases: ['划船', 'seated row', 'zzhc'] },
  { name: '单臂哑铃划船', aliases: ['哑铃划船', 'db row', 'dbylhc'] },
  { name: 'T杠划船', aliases: ['t bar row', 'tghc'] },
  { name: '直臂下压', aliases: ['straight arm pulldown', 'zbxy'] },
  { name: '硬拉', aliases: ['deadlift', 'yl'] },
  { name: '罗马尼亚硬拉', aliases: ['罗马尼亚硬拉', 'romanian deadlift', 'lmnyyl'] },
  { name: '相扑硬拉', aliases: ['sumo deadlift', 'xpyl'] },
  { name: '腿推', aliases: ['leg press', 'tt'] },
  { name: '深蹲', aliases: ['squat', 'sd'] },
  { name: '杠铃深蹲', aliases: ['深蹲', 'barbell squat', 'glsd'] },
  { name: '前蹲', aliases: ['front squat', 'qd'] },
  { name: '腿举', aliases: ['leg press', 'tj'] },
  { name: '哈克深蹲', aliases: ['hack squat', 'hksd'] },
  { name: '臀桥', aliases: ['glute bridge', 'tq'] },
  { name: '杠铃臀推', aliases: ['臀推', 'barbell hip thrust', 'gltt'] },
  { name: '箭步蹲', aliases: ['弓步蹲', 'lunge', 'jbd'] },
  { name: '保加利亚分腿蹲', aliases: ['分腿蹲', 'bulgarian split squat', 'bjlyftd'] },
  { name: '行走弓步蹲', aliases: ['走步弓步蹲', 'walking lunge', 'xzgbd'] },
  { name: '腿弯举', aliases: ['leg curl', 'twj'] },
  { name: '腿屈伸', aliases: ['leg extension', 'tqs'] },
  { name: '站姿提踵', aliases: ['提踵', '小腿', 'calf raise', 'zztz'] },
  { name: '坐姿提踵', aliases: ['提踵', '小腿', 'seated calf raise', 'zztz'] },
  { name: '髋外展', aliases: ['外展', 'hip abduction', 'kwz'] },
  { name: '髋内收', aliases: ['内收', 'hip adduction', 'kns'] },
  { name: '杠铃推举', aliases: ['肩推', '推举', 'overhead press', 'gltj'] },
  { name: '哑铃推举', aliases: ['肩推', '推举', 'dumbbell press', 'yltj'] },
  { name: '阿诺德推举', aliases: ['arnold press', 'andtj'] },
  { name: '哑铃侧平举', aliases: ['侧平举', '侧平', 'lateral raise', 'ylcpj'] },
  { name: '哑铃前平举', aliases: ['前平举', 'front raise', 'ylqpj'] },
  { name: '面拉', aliases: ['face pull', 'ml'] },
  { name: '反向飞鸟', aliases: ['俯身飞鸟', 'reverse fly', 'fxfn'] },
  { name: '耸肩', aliases: ['shrug', 'sj'] },
  { name: '杠铃弯举', aliases: ['弯举', 'barbell curl', 'glwj'] },
  { name: '哑铃弯举', aliases: ['弯举', 'dumbbell curl', 'ylwj'] },
  { name: '锤式弯举', aliases: ['锤式', 'hammer curl', 'cswj'] },
  { name: '牧师凳弯举', aliases: ['牧师弯举', 'preacher curl', 'msdwj'] },
  { name: '集中弯举', aliases: ['concentration curl', 'jzwj'] },
  { name: '绳索下压', aliases: ['下压', 'triceps pushdown', 'ssxy'] },
  { name: '窄距卧推', aliases: ['窄握卧推', 'close grip bench press', 'zjwt'] },
  { name: '颈后臂屈伸', aliases: ['臂屈伸', 'overhead triceps extension', 'jhbqs'] },
  { name: '仰卧臂屈伸', aliases: ['法式卧推', 'skull crusher', 'ywbqs'] },
  { name: '绳索臂屈伸', aliases: ['triceps rope extension', 'ssbqs'] },
  { name: '卷腹', aliases: ['crunch', 'jf'] },
  { name: '平板支撑', aliases: ['plank', 'pbzc'] },
  { name: '悬垂举腿', aliases: ['举腿', 'hanging leg raise', 'xcjt'] },
  { name: '俄罗斯转体', aliases: ['转体', 'russian twist', 'elszt'] },
  { name: '仰卧起坐', aliases: ['sit up', 'ywqz'] },
  { name: '绳索卷腹', aliases: ['cable crunch', 'ssjf'] },
  { name: '死虫', aliases: ['dead bug', 'sc'] },
  { name: '鸟狗', aliases: ['bird dog', 'ng'] },
]

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

export function findExerciseNameSuggestions(keyword: string, limit = 8) {
  const normalizedKeyword = normalizeKeyword(keyword)

  if (!normalizedKeyword) {
    return exerciseDictionary.slice(0, limit)
  }

  return exerciseDictionary
    .filter((entry) => {
      const searchableValues = [entry.name, ...(entry.aliases ?? [])]
      return searchableValues.some((value) =>
        normalizeKeyword(value).includes(normalizedKeyword),
      )
    })
    .slice(0, limit)
}
