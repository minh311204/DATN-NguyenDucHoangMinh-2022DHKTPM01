import { Controller, UseGuards } from '@nestjs/common'
import { TsRestHandler } from '@ts-rest/nest'
import { tourContract } from '../../../shared/contracts/tour.contract'
import { TourService } from './tour.service'
import { TourMediaService } from './tour-media.service'
import { TourTagService } from './tour-tag.service'
import { TourReviewService } from './tour-review.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@Controller('tours')
export class TourController {
  constructor(
    private readonly tourService: TourService,
    private readonly tourMediaService: TourMediaService,
    private readonly tourTagService: TourTagService,
    private readonly tourReviewService: TourReviewService,
  ) {}

  // --- Public (xem tour) ---

  @TsRestHandler(tourContract.getTourTags)
  getTourTags() {
    return async ({ query }: { query: { q?: string } }) => {
      const body = await this.tourTagService.getTags(query?.q)
      return { status: 200, body }
    }
  }

  @TsRestHandler(tourContract.getTours)
  @UseGuards(OptionalJwtAuthGuard)
  getTours(@CurrentUser() user?: { role?: string }) {
    return async ({ query }: { query: Record<string, unknown> }) => {
      const canQueryInactive = user?.role === 'ADMIN'
      const body = await this.tourService.getTours(query as any, {
        canQueryInactive,
      })
      return { status: 200, body }
    }
  }

  @TsRestHandler(tourContract.getTourById)
  @UseGuards(OptionalJwtAuthGuard)
  getTourById(@CurrentUser() user?: { role?: string }) {
    return async ({ params }: { params: { id: string } }) => {
      const allowInactive = user?.role === 'ADMIN'
      const body = await this.tourService.getTourById(Number(params.id), {
        allowInactive,
      })
      return { status: 200, body }
    }
  }

  // --- Chỉ ADMIN ---

  @TsRestHandler(tourContract.createTourTag)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createTourTag() {
    return async ({
      body,
    }: {
      body: { name: string; description?: string | null }
    }) => {
      const result = await this.tourTagService.createTag(body)
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.updateTourTag)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateTourTag() {
    return async ({
      params,
      body,
    }: {
      params: { id: string }
      body: { name?: string; description?: string | null }
    }) => {
      const result = await this.tourTagService.updateTag(Number(params.id), body)
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.deleteTourTag)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteTourTag() {
    return async ({ params }: { params: { id: string } }) => {
      const result = await this.tourTagService.deleteTag(Number(params.id))
      return { status: 200, body: { message: result.message } }
    }
  }

  @TsRestHandler(tourContract.createTour)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createTour() {
    return async ({ body }: { body: any }) => {
      const result = await this.tourService.createTour(body)
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.updateTour)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateTour() {
    return async ({ params, body }: { params: { id: string }; body: any }) => {
      const result = await this.tourService.updateTour(Number(params.id), body)
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.deleteTour)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteTour() {
    return async ({ params }: { params: { id: string } }) => {
      const result = await this.tourService.deleteTour(Number(params.id))
      return { status: 200, body: { message: result.message } }
    }
  }

  @TsRestHandler(tourContract.setTourTags)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setTourTags() {
    return async ({
      params,
      body,
    }: {
      params: { id: string }
      body: { tagIds: number[] }
    }) => {
      const result = await this.tourService.setTourTags(
        Number(params.id),
        body.tagIds,
      )
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.addTourImage)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addTourImage() {
    return async ({ params, body }: { params: { id: string }; body: any }) => {
      const result = await this.tourMediaService.addImage(Number(params.id), body)
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.removeTourImage)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeTourImage() {
    return async ({ params }: { params: { id: string; imageId: string } }) => {
      const result = await this.tourMediaService.removeImage(
        Number(params.id),
        Number(params.imageId),
      )
      return { status: 200, body: { message: result.message } }
    }
  }

  @TsRestHandler(tourContract.addTourVideo)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addTourVideo() {
    return async ({ params, body }: { params: { id: string }; body: any }) => {
      const result = await this.tourMediaService.addVideo(Number(params.id), body)
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.removeTourVideo)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeTourVideo() {
    return async ({ params }: { params: { id: string; videoId: string } }) => {
      const result = await this.tourMediaService.removeVideo(
        Number(params.id),
        Number(params.videoId),
      )
      return { status: 200, body: { message: result.message } }
    }
  }

  @TsRestHandler(tourContract.addTourSchedule)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addTourSchedule() {
    return async ({ params, body }: { params: { id: string }; body: any }) => {
      const result = await this.tourService.addSchedule(Number(params.id), body)
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.updateTourSchedule)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateTourSchedule() {
    return async ({
      params,
      body,
    }: {
      params: { scheduleId: string }
      body: any
    }) => {
      const result = await this.tourService.updateSchedule(
        Number(params.scheduleId),
        body,
      )
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.removeTourSchedule)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeTourSchedule() {
    return async ({ params }: { params: { scheduleId: string } }) => {
      const result = await this.tourService.removeSchedule(
        Number(params.scheduleId),
      )
      return { status: 200, body: { message: result.message } }
    }
  }

  @TsRestHandler(tourContract.addTourItinerary)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addTourItinerary() {
    return async ({ params, body }: { params: { id: string }; body: any }) => {
      const result = await this.tourService.addItinerary(Number(params.id), body)
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.updateTourItinerary)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateTourItinerary() {
    return async ({
      params,
      body,
    }: {
      params: { itineraryId: string }
      body: any
    }) => {
      const result = await this.tourService.updateItinerary(
        Number(params.itineraryId),
        body,
      )
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.removeTourItinerary)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeTourItinerary() {
    return async ({ params }: { params: { itineraryId: string } }) => {
      const result = await this.tourService.removeItinerary(
        Number(params.itineraryId),
      )
      return { status: 200, body: { message: result.message } }
    }
  }

  // --- Reviews (người dùng) ---

  @TsRestHandler(tourContract.getTourReviews)
  getTourReviews() {
    return async ({ params }: { params: { id: string } }) => {
      const body = await this.tourReviewService.listReviews(Number(params.id))
      return { status: 200, body }
    }
  }

  @TsRestHandler(tourContract.upsertTourReview)
  @UseGuards(JwtAuthGuard)
  upsertTourReview(@CurrentUser() user: { id: number }) {
    return async ({
      params,
      body,
    }: {
      params: { id: string }
      body: { rating: number; comment?: string | null }
    }) => {
      const result = await this.tourReviewService.upsertReview({
        tourId: Number(params.id),
        userId: user.id,
        rating: body.rating,
        comment: body.comment ?? null,
      })
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.deleteMyReview)
  @UseGuards(JwtAuthGuard)
  deleteMyReview(@CurrentUser() user: { id: number }) {
    return async ({ params }: { params: { id: string } }) => {
      const result = await this.tourReviewService.deleteReview(
        user.id,
        Number(params.id),
      )
      return { status: 200, body: result }
    }
  }

  // --- Transports (chặng vận chuyển) — chỉ ADMIN ---

  @TsRestHandler(tourContract.addTourTransport)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addTourTransport() {
    return async ({ params, body }: { params: { id: string }; body: any }) => {
      const result = await this.tourService.addTransport(Number(params.id), body)
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.updateTourTransport)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateTourTransport() {
    return async ({
      params,
      body,
    }: {
      params: { transportId: string }
      body: any
    }) => {
      const result = await this.tourService.updateTransport(
        Number(params.transportId),
        body,
      )
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.removeTourTransport)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeTourTransport() {
    return async ({ params }: { params: { transportId: string } }) => {
      const result = await this.tourService.removeTransport(
        Number(params.transportId),
      )
      return { status: 200, body: { message: result.message } }
    }
  }

  // --- Accommodations (lưu trú) — chỉ ADMIN ---

  @TsRestHandler(tourContract.addItineraryAccommodation)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addItineraryAccommodation() {
    return async ({
      params,
      body,
    }: {
      params: { itineraryId: string }
      body: any
    }) => {
      const result = await this.tourService.addAccommodation(
        Number(params.itineraryId),
        body,
      )
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.updateItineraryAccommodation)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateItineraryAccommodation() {
    return async ({
      params,
      body,
    }: {
      params: { accommodationId: string }
      body: any
    }) => {
      const result = await this.tourService.updateAccommodation(
        Number(params.accommodationId),
        body,
      )
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.removeItineraryAccommodation)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeItineraryAccommodation() {
    return async ({ params }: { params: { accommodationId: string } }) => {
      const result = await this.tourService.removeAccommodation(
        Number(params.accommodationId),
      )
      return { status: 200, body: { message: result.message } }
    }
  }

  // --- Meals (bữa ăn) — chỉ ADMIN ---

  @TsRestHandler(tourContract.addItineraryMeal)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  addItineraryMeal() {
    return async ({
      params,
      body,
    }: {
      params: { itineraryId: string }
      body: any
    }) => {
      const result = await this.tourService.addMeal(
        Number(params.itineraryId),
        body,
      )
      return { status: 201, body: result }
    }
  }

  @TsRestHandler(tourContract.updateItineraryMeal)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateItineraryMeal() {
    return async ({
      params,
      body,
    }: {
      params: { mealId: string }
      body: any
    }) => {
      const result = await this.tourService.updateMeal(
        Number(params.mealId),
        body,
      )
      return { status: 200, body: result }
    }
  }

  @TsRestHandler(tourContract.removeItineraryMeal)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeItineraryMeal() {
    return async ({ params }: { params: { mealId: string } }) => {
      const result = await this.tourService.removeMeal(Number(params.mealId))
      return { status: 200, body: { message: result.message } }
    }
  }
}
