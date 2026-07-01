// Australian state/territory maths curriculum authorities. VIC, NSW and WA
// publish their own maths curriculum; QLD, SA, NT, ACT and TAS adopt the national
// Australian Curriculum v9 directly, so those link to the national maths site.
export const AUSTRALIAN_CURRICULUM_MATHS =
  'https://www.australiancurriculum.edu.au/f-10-curriculum/mathematics/'

export const STATE_CURRICULUM = [
  { code: 'VIC', name: 'Victoria', authority: 'VCAA', url: 'https://f10.vcaa.vic.edu.au/learning-areas/mathematics/introduction' },
  { code: 'NSW', name: 'New South Wales', authority: 'NESA', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics' },
  { code: 'QLD', name: 'Queensland', authority: 'Australian Curriculum', url: AUSTRALIAN_CURRICULUM_MATHS },
  { code: 'WA', name: 'Western Australia', authority: 'SCSA', url: 'https://k10outline.scsa.wa.edu.au/home/teaching/curriculum-browser/mathematics-v9' },
  { code: 'SA', name: 'South Australia', authority: 'Australian Curriculum', url: AUSTRALIAN_CURRICULUM_MATHS },
  { code: 'NT', name: 'Northern Territory', authority: 'Australian Curriculum', url: AUSTRALIAN_CURRICULUM_MATHS },
  { code: 'ACT', name: 'Australian Capital Territory', authority: 'Australian Curriculum', url: AUSTRALIAN_CURRICULUM_MATHS },
  { code: 'TAS', name: 'Tasmania', authority: 'Australian Curriculum', url: AUSTRALIAN_CURRICULUM_MATHS },
]

// The five maths strands (per the Australian Curriculum), shown on each page.
export const MATHS_STRANDS = ['Number', 'Algebra', 'Measurement', 'Space', 'Statistics', 'Probability']
