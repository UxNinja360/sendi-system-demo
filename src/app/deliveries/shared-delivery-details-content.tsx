import React from 'react';
import { Phone, MapPin, Star, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Courier, Delivery } from '../types/delivery.types';
import { formatAddressWithArea } from '../utils/delivery-presenters';
import {
  formatCurrency,
  getDeliveryCashAmount,
  getDeliveryCourierBasePay,
  getDeliveryCourierTip,
  getDeliveryCustomerCharge,
  getDeliveryRestaurantCharge,
} from '../utils/delivery-finance';

const initials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-4 pt-5 pb-2">
    <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3] dark:text-[#555]">
      {children}
    </span>
  </div>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode; green?: boolean }> = ({
  label,
  value,
  green,
}) => (
  <div className="flex items-center justify-between border-b border-[#f5f5f5] px-4 py-3 last:border-0 dark:border-[#1a1a1a]">
    <span className="shrink-0 text-sm text-[#888] dark:text-[#666]">{label}</span>
    <span
      className={`max-w-[60%] text-left text-sm font-medium ${
        green ? 'text-green-600 dark:text-green-400' : 'text-[#0d0d12] dark:text-app-text'
      }`}
    >
      {value || '—'}
    </span>
  </div>
);

interface Props {
  delivery: Delivery;
  courier: Courier | null;
}

export const SharedDeliveryDetailsContent: React.FC<Props> = ({ delivery, courier }) => {
  const timelineSteps = [
    { label: '????', time: delivery.createdAt, done: true },
    { label: '???? ????', time: delivery.assignedAt, done: !!delivery.assignedAt },
    { label: '????? ?????', time: delivery.started_pickup, done: !!delivery.started_pickup },
    { label: '???? ??????', time: delivery.arrivedAtRestaurantAt, done: !!delivery.arrivedAtRestaurantAt },
    { label: '????', time: delivery.pickedUpAt, done: !!delivery.pickedUpAt },
    { label: '????? ?????', time: delivery.started_dropoff, done: !!delivery.started_dropoff },
    { label: '???? ?????', time: delivery.arrivedAtCustomerAt, done: !!delivery.arrivedAtCustomerAt },
    { label: '????', time: delivery.deliveredAt, done: !!delivery.deliveredAt },
  ];
  const doneCount = timelineSteps.filter((step) => step.done).length;
  const customerCharge = getDeliveryCustomerCharge(delivery);
  const restaurantCharge = getDeliveryRestaurantCharge(delivery);
  const courierPay = getDeliveryCourierBasePay(delivery);
  const courierTip = getDeliveryCourierTip(delivery);
  const cashAmount = getDeliveryCashAmount(delivery);
  const offerExpiresAt = delivery.offerExpiresAt ? new Date(delivery.offerExpiresAt) : null;

  return (
    <div className="pb-2">
      <SectionTitle>???? ?????</SectionTitle>
      <div className="border-t border-[#f5f5f5] dark:border-[#1a1a1a]">
        <InfoRow label="???? ?????" value={formatCurrency(customerCharge)} green />
        <InfoRow label="??? ?????" value={`${delivery.estimatedTime} ???`} />
        {delivery.delivery_distance ? (
          <InfoRow label="????" value={`${delivery.delivery_distance.toFixed(1)} ?"?`} />
        ) : null}
        {offerExpiresAt && !Number.isNaN(offerExpiresAt.getTime()) ? (
          <InfoRow label="???? ????" value={offerExpiresAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} />
        ) : null}
        {delivery.is_cash ? (
          <InfoRow
            label="?????"
            value={
              <span className="font-semibold text-green-600 dark:text-green-400">
                ?? ????? {formatCurrency(cashAmount)}
              </span>
            }
          />
        ) : null}
        {restaurantCharge > 0 ? <InfoRow label="???? ?????" value={formatCurrency(restaurantCharge)} /> : null}
        {courierPay > 0 ? <InfoRow label="????? ????" value={formatCurrency(courierPay)} /> : null}
        {courierTip > 0 ? <InfoRow label="???" value={formatCurrency(courierTip)} /> : null}
      </div>

      <SectionTitle>???? ?????</SectionTitle>
      <div className="border-t border-[#f5f5f5] px-4 py-3 dark:border-[#1a1a1a]">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            {initials(delivery.restaurantName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">{delivery.restaurantName}</p>
            {delivery.branchName ? <p className="text-xs text-[#a3a3a3]">{delivery.branchName}</p> : null}
          </div>
        </div>
        <div className="space-y-2">
          {delivery.restaurantAddress || delivery.rest_city ? (
            <div className="flex items-start gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
              <MapPin size={12} className="mt-0.5 shrink-0 text-[#bbb]" />
              <span>{[delivery.restaurantAddress, delivery.rest_city].filter(Boolean).join(', ')}</span>
            </div>
          ) : null}
        </div>
      </div>

      <SectionTitle>???? ????</SectionTitle>
      <div className="border-t border-[#f5f5f5] px-4 py-3 dark:border-[#1a1a1a]">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            {initials(delivery.customerName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">{delivery.customerName}</p>
            {delivery.customerPhone ? (
              <a
                href={`tel:${delivery.customerPhone}`}
                className="flex items-center gap-1 text-xs text-[#a3a3a3] transition-colors hover:text-[#9fe870]"
              >
                <Phone size={10} />
                {delivery.customerPhone}
              </a>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-[#666d80] dark:text-app-text-secondary">
            <MapPin size={12} className="mt-0.5 shrink-0 text-[#bbb]" />
            <span>{formatAddressWithArea(delivery.address, delivery.area)}</span>
          </div>
          {delivery.customerBuilding || delivery.client_entry || delivery.client_floor || delivery.client_apartment ? (
            <p className="pr-5 text-xs text-[#a3a3a3]">
              {[
                delivery.customerBuilding && `????? ${delivery.customerBuilding}`,
                delivery.client_entry && `????? ${delivery.client_entry}`,
                delivery.client_floor && `???? ${delivery.client_floor}`,
                delivery.client_apartment && `???? ${delivery.client_apartment}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
          {delivery.client_comment ? (
            <div className="mt-1 rounded-lg border border-yellow-200 bg-yellow-50 px-2.5 py-1.5 text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
              ?? {delivery.client_comment}
            </div>
          ) : null}
          {delivery.customerRating ? (
            <div className="flex items-center gap-1.5 pt-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-3.5 w-3.5 ${
                    index < (delivery.customerRating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-[#d4d4d4] dark:text-[#333]'
                  }`}
                />
              ))}
              {delivery.customerFeedback ? (
                <span className="mr-1 text-xs italic text-[#a3a3a3]">"{delivery.customerFeedback}"</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <SectionTitle>???? ????</SectionTitle>
      <div className="border-t border-[#f5f5f5] px-4 py-3 dark:border-[#1a1a1a]">
        {courier ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                {initials(courier.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0d0d12] dark:text-app-text">{courier.name}</p>
                <span
                  className={`text-xs font-medium ${
                    courier.status === 'available'
                      ? 'text-green-500'
                      : courier.status === 'busy'
                        ? 'text-orange-400'
                        : 'text-[#a3a3a3]'
                  }`}
                >
                  {courier.status === 'available'
                    ? '????'
                    : courier.status === 'busy'
                      ? '????'
                      : '?? ?????'}
                </span>
              </div>
              <div className="mr-auto flex items-center gap-1 text-xs text-[#a3a3a3]">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {courier.rating}
              </div>
            </div>
            <div className="space-y-2">
              <a
                href={`tel:${courier.phone}`}
                className="flex items-center gap-2 text-xs text-[#666d80] transition-colors hover:text-[#9fe870] dark:text-app-text-secondary"
              >
                <Phone size={12} className="shrink-0 text-[#bbb]" />
                {courier.phone}
              </a>
              <p className="text-xs text-[#a3a3a3]">{courier.totalDeliveries} ??????? ??"?</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-[#a3a3a3] dark:text-[#555]">?? ???? ????</p>
        )}
      </div>

      <SectionTitle>???? ?????</SectionTitle>
      <div className="border-t border-[#f5f5f5] px-4 pt-2 pb-1 dark:border-[#1a1a1a]">
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-[#262626]">
          <div
            className="h-full rounded-full bg-[#9fe870]"
            style={{ width: `${Math.round((doneCount / timelineSteps.length) * 100)}%` }}
          />
        </div>
        <div className="space-y-0">
          {timelineSteps.map((step) => {
            const isDeliveredStep = step.label === '????';
            const doneClassName = isDeliveredStep ? 'bg-blue-500' : 'bg-[#9fe870]';
            const doneIconClassName = isDeliveredStep ? 'text-white' : 'text-[#0d0d12]';

            return (
            <div
              key={step.label}
              className="flex items-center gap-3 border-b border-[#f5f5f5] py-2.5 last:border-0 dark:border-[#1a1a1a]"
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  step.done ? doneClassName : 'bg-[#f0f0f0] dark:bg-[#262626]'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 size={13} className={doneIconClassName} />
                ) : (
                  <Clock size={11} className="text-[#bbb]" />
                )}
              </div>
              <span
                className={`flex-1 text-sm ${
                  step.done
                    ? 'font-medium text-[#0d0d12] dark:text-app-text'
                    : 'text-[#bbb] dark:text-[#444]'
                }`}
              >
                {step.label}
              </span>
              <span className="tabular-nums text-xs text-[#a3a3a3]">
                {step.time ? format(step.time, 'HH:mm', { locale: he }) : '—'}
              </span>
            </div>
            );
          })}
        </div>
      </div>

      {delivery.deliveryNotes || delivery.orderNotes || delivery.comment ? (
        <>
          <SectionTitle>?????</SectionTitle>
          <div className="space-y-1.5 border-t border-[#f5f5f5] px-4 pt-3 pb-3 dark:border-[#1a1a1a]">
            {delivery.deliveryNotes ? (
              <p className="text-xs text-[#666d80] dark:text-app-text-secondary">?? {delivery.deliveryNotes}</p>
            ) : null}
            {delivery.orderNotes ? (
              <p className="text-xs text-[#666d80] dark:text-app-text-secondary">?? {delivery.orderNotes}</p>
            ) : null}
            {delivery.comment ? (
              <p className="text-xs text-[#666d80] dark:text-app-text-secondary">?? {delivery.comment}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
};

