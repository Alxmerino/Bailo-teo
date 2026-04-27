import { z } from 'zod'

export const eventTypeSchema = z.enum(['sleep', 'breastfeed', 'bottle', 'note', 'diaper', 'bath', 'pump'])
export const diaperKindSchema = z.enum(['poop', 'wet', 'both'])
export const feedSideSchema = z.enum(['left', 'right', 'both'])
export const milkTypeSchema = z.enum(['breastmilk', 'formula', 'combination'])

export const sleepDataSchema = z.object({})
export const breastfeedDataSchema = z.object({
  sides: feedSideSchema,
  notes: z.string().optional(),
})
export const pumpDataSchema = z.object({
  sides: feedSideSchema,
  oz: z.number().positive().optional(),
})
export const bottleDataSchema = z.object({
  milkType: milkTypeSchema,
  oz: z.number().positive(),
  breastmilkOz: z.number().min(0).optional(),
  formulaOz: z.number().min(0).optional(),
})
export const noteDataSchema = z.object({
  text: z.string().min(1),
})
export const diaperDataSchema = z.object({
  kind: diaperKindSchema,
})
export const bathDataSchema = z.object({
  notes: z.string().optional(),
})

export const parentSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Min 8 characters'),
  displayName: z.string().min(1, 'Required').max(30),
  familyName: z.string().min(1, 'Required').max(50),
})

export const caregiverSignupSchema = z.object({
  inviteCode: z.string().length(6, 'Code is 6 characters'),
  displayName: z.string().min(1, 'Required').max(30),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
})

export const caregiverLoginSchema = z.object({
  inviteCode: z.string().length(6, 'Code is 6 characters'),
  displayName: z.string().min(1, 'Required'),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
})
