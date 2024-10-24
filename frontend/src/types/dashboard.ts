// src/types/dashboard.ts

export interface DashboardData {
    totalSales: number;
    confirmedPayments: number;
    activeRaffles: number;
    salesGrowth: number;
    paymentsGrowth: number;
    rafflesGrowth: number;
  }
  
  export interface Ticket {
    ticketNumber: number;
    status: 'available' | 'reserved' | 'sold';
    userId?: string;
    reservedAt?: Date;
  }
  
  export interface SummaryItem {
    title: string;
    value: string;
    change: string;
    icon: React.ReactNode;
  }