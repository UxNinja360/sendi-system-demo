import { CourierShiftAssignment } from '../types/delivery.types';

export const getAssignmentWorkedMinutes = (
  assignment: Pick<CourierShiftAssignment, 'startedAt' | 'endedAt'>,
  now: Date = new Date()
) => {
  if (!assignment.startedAt) return 0;
  const end = assignment.endedAt ?? now;
  const diffMs = end.getTime() - assignment.startedAt.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
};

export const formatWorkedDuration = (minutes: number) => {
  if (minutes < 0) return '\u05d8\u05e8\u05dd \u05d4\u05ea\u05d7\u05d9\u05dc/\u05d4';
  if (minutes === 0) return '\u05d4\u05ea\u05d7\u05d9\u05dc/\u05d4 \u05e2\u05db\u05e9\u05d9\u05d5';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}\u05d3\u05f3`;
  }

  if (remainingMinutes === 0) {
    return `${hours}\u05e9\u05f3`;
  }

  return `${hours}\u05e9\u05f3 ${remainingMinutes}\u05d3\u05f3`;
};

export const getWorkedMinutesWithinRange = (
  assignment: Pick<CourierShiftAssignment, 'startedAt' | 'endedAt'>,
  rangeStart: Date,
  rangeEnd: Date,
  now: Date = new Date()
) => {
  if (!assignment.startedAt) return 0;

  const assignmentStart = assignment.startedAt.getTime();
  const assignmentEnd = (assignment.endedAt ?? now).getTime();
  const overlapStart = Math.max(assignmentStart, rangeStart.getTime());
  const overlapEnd = Math.min(assignmentEnd, rangeEnd.getTime());

  if (overlapEnd <= overlapStart) return 0;

  return Math.floor((overlapEnd - overlapStart) / 60000);
};
