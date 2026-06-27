export const formatOrdinal = (value: number) => {
  const rounded = Math.round(value);
  const absolute = Math.abs(rounded);
  const mod100 = absolute % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${rounded}th`;
  }

  switch (absolute % 10) {
    case 1:
      return `${rounded}st`;
    case 2:
      return `${rounded}nd`;
    case 3:
      return `${rounded}rd`;
    default:
      return `${rounded}th`;
  }
};
