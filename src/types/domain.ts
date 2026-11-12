export type { Product, ProductInput, Ingredient } from '../models/productModel';
export type { IngredientRecord } from '../data/ingredientDatabase';
export type { Analysis, AnalysisOptions, Finding, IngredientEvidence } from '../utils/halalAnalyzer';
export type { LookupResult } from '../utils/productRepository';
export type { Session, User } from '@supabase/supabase-js';
export interface AnalyticsSummary { totalEvents: number; eventCounts: Record<string, number>; dailyActivity?: Record<string, number>; sessions?: number; languages?: Record<string, number>; devices?: Record<string, number> }
