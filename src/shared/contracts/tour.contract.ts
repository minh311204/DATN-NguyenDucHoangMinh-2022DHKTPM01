import { initContract } from '@ts-rest/core'
import { z } from 'zod'
import { withExceptionResponse } from './helpers'
import {
  CreateTourTagSchema,
  UpdateTourTagSchema,
  TourTagResponseSchema,
  TourImageResponseSchema,
  CreateTourImageSchema,
  TourVideoResponseSchema,
  CreateTourVideoSchema,
  TourScheduleResponseSchema,
  CreateTourScheduleSchema,
  UpdateTourScheduleSchema,
  TourItineraryResponseSchema,
  CreateTourItinerarySchema,
  UpdateTourItinerarySchema,
  TourListItemSchema,
  TourDetailResponseSchema,
  CreateTourSchema,
  UpdateTourSchema,
  SetTourTagsSchema,
  TourListQuerySchema,
  TourListPaginatedResponseSchema,
  CreateOrUpdateTourReviewSchema,
  TourReviewResponseSchema,
  UpsertTourReviewResponseSchema,
  TourRatingSummarySchema,
  TourTransportResponseSchema,
  CreateTourTransportSchema,
  UpdateTourTransportSchema,
  TourAccommodationResponseSchema,
  CreateTourAccommodationSchema,
  UpdateTourAccommodationSchema,
  TourMealResponseSchema,
  CreateTourMealSchema,
  UpdateTourMealSchema,
} from '../schema/tour.schema'

const c = initContract()

const idParams = z.object({ id: z.coerce.number().int() })
const tourImageParams = z.object({
  id: z.coerce.number().int(),
  imageId: z.coerce.number().int(),
})
const tourVideoParams = z.object({
  id: z.coerce.number().int(),
  videoId: z.coerce.number().int(),
})
const tourTagParams = z.object({ id: z.coerce.number().int() })
const scheduleParams = z.object({ scheduleId: z.coerce.number().int() })
const itineraryParams = z.object({ itineraryId: z.coerce.number().int() })
const transportParams = z.object({ transportId: z.coerce.number().int() })
const accommodationParams = z.object({ accommodationId: z.coerce.number().int() })
const mealParams = z.object({ mealId: z.coerce.number().int() })

export const tourContract = c.router({
  // Tags (global)
  getTourTags: {
    method: 'GET',
    path: '/tags',
    query: z.object({
      q: z.string().optional(),
    }),
    responses: withExceptionResponse({
      200: z.array(TourTagResponseSchema),
    }),
  },

  createTourTag: {
    method: 'POST',
    path: '/tags',
    body: CreateTourTagSchema,
    responses: withExceptionResponse({
      201: TourTagResponseSchema,
    }),
  },

  updateTourTag: {
    method: 'PUT',
    path: '/tags/:id',
    pathParams: tourTagParams,
    body: UpdateTourTagSchema,
    responses: withExceptionResponse({
      200: TourTagResponseSchema,
    }),
  },

  deleteTourTag: {
    method: 'DELETE',
    path: '/tags/:id',
    pathParams: tourTagParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  // Tours
  getTours: {
    method: 'GET',
    path: '',
    query: TourListQuerySchema,
    responses: withExceptionResponse({
      200: z.union([
        z.array(TourListItemSchema),
        TourListPaginatedResponseSchema,
      ]),
    }),
  },

  getTourById: {
    method: 'GET',
    path: '/:id',
    pathParams: idParams,
    responses: withExceptionResponse({
      200: TourDetailResponseSchema,
    }),
  },

  createTour: {
    method: 'POST',
    path: '/',
    body: CreateTourSchema,
    responses: withExceptionResponse({
      201: TourDetailResponseSchema,
    }),
  },

  updateTour: {
    method: 'PUT',
    path: '/:id',
    pathParams: idParams,
    body: UpdateTourSchema,
    responses: withExceptionResponse({
      200: TourDetailResponseSchema,
    }),
  },

  deleteTour: {
    method: 'DELETE',
    path: '/:id',
    pathParams: idParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  setTourTags: {
    method: 'PUT',
    path: '/:id/tags',
    pathParams: idParams,
    body: SetTourTagsSchema,
    responses: withExceptionResponse({
      200: TourDetailResponseSchema,
    }),
  },

  // Images
  addTourImage: {
    method: 'POST',
    path: '/:id/images',
    pathParams: idParams,
    body: CreateTourImageSchema,
    responses: withExceptionResponse({
      201: TourImageResponseSchema,
    }),
  },

  removeTourImage: {
    method: 'DELETE',
    path: '/:id/images/:imageId',
    pathParams: tourImageParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  // Videos
  addTourVideo: {
    method: 'POST',
    path: '/:id/videos',
    pathParams: idParams,
    body: CreateTourVideoSchema,
    responses: withExceptionResponse({
      201: TourVideoResponseSchema,
    }),
  },

  removeTourVideo: {
    method: 'DELETE',
    path: '/:id/videos/:videoId',
    pathParams: tourVideoParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  // Schedules
  addTourSchedule: {
    method: 'POST',
    path: '/:id/schedules',
    pathParams: idParams,
    body: CreateTourScheduleSchema,
    responses: withExceptionResponse({
      201: TourScheduleResponseSchema,
    }),
  },

  updateTourSchedule: {
    method: 'PUT',
    path: '/schedules/:scheduleId',
    pathParams: scheduleParams,
    body: UpdateTourScheduleSchema,
    responses: withExceptionResponse({
      200: TourScheduleResponseSchema,
    }),
  },

  removeTourSchedule: {
    method: 'DELETE',
    path: '/schedules/:scheduleId',
    pathParams: scheduleParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  // Itineraries
  addTourItinerary: {
    method: 'POST',
    path: '/:id/itineraries',
    pathParams: idParams,
    body: CreateTourItinerarySchema,
    responses: withExceptionResponse({
      201: TourItineraryResponseSchema,
    }),
  },

  updateTourItinerary: {
    method: 'PUT',
    path: '/itineraries/:itineraryId',
    pathParams: itineraryParams,
    body: UpdateTourItinerarySchema,
    responses: withExceptionResponse({
      200: TourItineraryResponseSchema,
    }),
  },

  removeTourItinerary: {
    method: 'DELETE',
    path: '/itineraries/:itineraryId',
    pathParams: itineraryParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  // Reviews (người dùng)
  getTourReviews: {
    method: 'GET',
    path: '/:id/reviews',
    pathParams: idParams,
    responses: withExceptionResponse({
      200: z.array(TourReviewResponseSchema),
    }),
  },

  upsertTourReview: {
    method: 'POST',
    path: '/:id/reviews',
    pathParams: idParams,
    body: CreateOrUpdateTourReviewSchema,
    responses: withExceptionResponse({
      200: UpsertTourReviewResponseSchema,
    }),
  },

  deleteMyReview: {
    method: 'DELETE',
    path: '/:id/reviews/mine',
    pathParams: idParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string(), tour: TourRatingSummarySchema }),
    }),
  },

  // Transports (chặng vận chuyển)
  addTourTransport: {
    method: 'POST',
    path: '/:id/transports',
    pathParams: idParams,
    body: CreateTourTransportSchema,
    responses: withExceptionResponse({
      201: TourTransportResponseSchema,
    }),
  },

  updateTourTransport: {
    method: 'PUT',
    path: '/transports/:transportId',
    pathParams: transportParams,
    body: UpdateTourTransportSchema,
    responses: withExceptionResponse({
      200: TourTransportResponseSchema,
    }),
  },

  removeTourTransport: {
    method: 'DELETE',
    path: '/transports/:transportId',
    pathParams: transportParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  // Accommodations (lưu trú theo ngày lịch trình)
  addItineraryAccommodation: {
    method: 'POST',
    path: '/itineraries/:itineraryId/accommodations',
    pathParams: itineraryParams,
    body: CreateTourAccommodationSchema,
    responses: withExceptionResponse({
      201: TourAccommodationResponseSchema,
    }),
  },

  updateItineraryAccommodation: {
    method: 'PUT',
    path: '/accommodations/:accommodationId',
    pathParams: accommodationParams,
    body: UpdateTourAccommodationSchema,
    responses: withExceptionResponse({
      200: TourAccommodationResponseSchema,
    }),
  },

  removeItineraryAccommodation: {
    method: 'DELETE',
    path: '/accommodations/:accommodationId',
    pathParams: accommodationParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },

  // Meals (bữa ăn theo ngày lịch trình)
  addItineraryMeal: {
    method: 'POST',
    path: '/itineraries/:itineraryId/meals',
    pathParams: itineraryParams,
    body: CreateTourMealSchema,
    responses: withExceptionResponse({
      201: TourMealResponseSchema,
    }),
  },

  updateItineraryMeal: {
    method: 'PUT',
    path: '/meals/:mealId',
    pathParams: mealParams,
    body: UpdateTourMealSchema,
    responses: withExceptionResponse({
      200: TourMealResponseSchema,
    }),
  },

  removeItineraryMeal: {
    method: 'DELETE',
    path: '/meals/:mealId',
    pathParams: mealParams,
    responses: withExceptionResponse({
      200: z.object({ message: z.string() }),
    }),
  },
})
