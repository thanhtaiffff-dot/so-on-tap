// Dữ liệu mẫu cho lần mở trang đầu tiên, để thấy ngay trang làm được gì.
import { uid } from './uuid.js'
import { VERSION } from './schema.js'
import { blank } from './srs.js'

export function makeSample(now = Date.now()) {
  const en = uid()
  const ly = uid()
  let n = 0
  const c = (subjectId, front, back, note = '') => ({
    id: uid(),
    subjectId,
    front,
    back,
    note,
    createdAt: now + n++,
    ...blank(),
  })
  return {
    version: VERSION,
    subjects: [
      { id: en, name: 'Tiếng Anh', hue: 222, createdAt: now },
      { id: ly, name: 'Vật lý', hue: 152, createdAt: now + 1 },
    ],
    cards: [
      c(en, 'ambitious', 'tham vọng, có hoài bão', 'Ví dụ: She is ambitious about her career.'),
      c(en, 'consistent', 'nhất quán, kiên định'),
      c(en, 'reluctant', 'miễn cưỡng, ngần ngại'),
      c(en, 'thorough', 'kỹ lưỡng, cẩn thận'),
      c(en, 'efficient', 'hiệu quả (ít tốn công sức)'),
      c(en, 'curious', 'tò mò, ham hiểu biết'),
      c(ly, 'Định luật Ohm', 'I = U / R', 'I: cường độ dòng điện (A), U: hiệu điện thế (V), R: điện trở (Ω).'),
      c(ly, 'Công suất điện', 'P = U · I'),
      c(ly, 'Định luật II Newton', 'F = m · a'),
      c(ly, 'Động năng', 'Wđ = ½ · m · v²'),
      c(ly, 'Thế năng trọng trường', 'Wt = m · g · h'),
    ],
    notes: [
      {
        id: uid(),
        subjectId: en,
        title: 'Thì hiện tại hoàn thành',
        body:
          'Cấu trúc: S + have/has + V3\n\nDùng khi:\n• Việc đã xảy ra, kết quả còn ở hiện tại\n• Kinh nghiệm (ever, never)\n• Kéo dài đến nay (for, since)\n\nVí dụ: I have lived in Ho Chi Minh City since 2024.',
        updatedAt: now,
      },
      {
        id: uid(),
        subjectId: ly,
        title: 'Mẹo nhớ đơn vị',
        body: 'U: vôn (V)\nI: ampe (A)\nR: ôm (Ω)\nP: oát (W)\n\nMẹo: "U = I nhân R", đọc là "U-I-R" cho dễ nhớ.',
        updatedAt: now,
      },
    ],
    quizHistory: [],
  }
}
