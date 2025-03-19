export const getAvatarByAgeAndGender = (age: number, gender: string): string => {
  // 统一性别判断，支持多种女性的表示方式
  const isFemale = ['女', 'f', 'F', 'female', 'Female', '女性'].includes(gender);
  
  if (isFemale) {
    if (age < 30) return '/images/20_females.png';
    if (age < 40) return '/images/30_females.png';
    if (age < 50) return '/images/40_females.png';
    return '/images/50_females.png';
  } else {
    if (age < 30) return '/images/20_males.png';
    if (age < 40) return '/images/30_males.png';
    if (age < 50) return '/images/40_males.png';
    return '/images/50_males.png';
  }
}; 