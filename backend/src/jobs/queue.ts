import { Worker, Job } from 'bullmq';
import haversine from 'haversine-distance';
import { DeliveryType, DispatchStatus, DeliveryStatus } from '../types';
import { dispatchQueue, prisma, redis } from '../servers';
import { ORDER_DELAY } from '../constants';
import { sendNotification } from '../servers/firebase';




new Worker('dispatch-queue', async (job: Job) => {
    try {
        const { orderId, attempt } = job.data;
        const order = await prisma.order.findUnique({ where: { id: orderId }, include: { delivery: true, partner: true } });
        if (!order || !order.delivery || order.delivery.status !== DeliveryStatus.READY || order.delivery.type !== DeliveryType.NORMAL) return;
        const delivery = order.delivery
        const drivers = await prisma.driver.findMany({
            where: {
                isAvailable: true,
                online: true,
                deliveries: { none: { status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED] } } },
            },
            select: {
                id: true,
                userId: true,
                latitude: true,
                longitude: true,
                locationUpdatedAt: true,
                user: {
                    select: {
                        pushTokens: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: { id: true, token: true, userId: true },
                        },
                    }
                }
            }
        });
        const previousDispatches = await prisma.orderDispatch.findMany({
            where: { deliveryId: delivery.id },
            select: { driverId: true, status: true },
        })
        const previouslyRejected = new Set(previousDispatches.filter((entry) => entry.status === DispatchStatus.REJECTED).map((entry) => entry.driverId))
        const freshnessCutoff = Date.now() - 10 * 60 * 1000
        const targetDrivers = drivers
            .filter((driver) => {
                const validLocation = Number.isFinite(driver.latitude) && Number.isFinite(driver.longitude) && !(driver.latitude === 0 && driver.longitude === 0)
                const freshEnough = !driver.locationUpdatedAt || driver.locationUpdatedAt.getTime() >= freshnessCutoff
                return validLocation && freshEnough && !previouslyRejected.has(driver.userId)
            })
            .map((driver) => ({
                ...driver,
                distance: haversine(
                    { lat: order.partner.latitude, lng: order.partner.longitude },
                    { lat: driver.latitude, lng: driver.longitude },
                ),
            }))
            .sort((left, right) => left.distance - right.distance)
            .slice(0, 3);
        const expiresAt = new Date(Date.now() + ORDER_DELAY);


        // Set all orders in prisma to EXPIRED if expiresAt < now
        await prisma.orderDispatch.updateMany({
            where: {
                expiresAt: { lt: new Date() },
                status: { not: DispatchStatus.EXPIRED }
            },
            data: {
                status: DispatchStatus.EXPIRED
            }
        });

        await Promise.all(
            targetDrivers.map(async (d) => {
                await prisma.orderDispatch.updateMany({
                    where: { deliveryId: delivery.id, driverId: d.userId, status: DispatchStatus.SENT },
                    data: { status: DispatchStatus.EXPIRED },
                })
                return prisma.orderDispatch.create({
                    data: {
                        orderId: order.id,
                        deliveryId: delivery.id,
                        driverId: d.userId,
                        status: DispatchStatus.SENT,
                        sentAt: new Date(),
                        expiresAt
                    },
                })
            })
        );


        sendNotification({
            tokens: targetDrivers
                .map(v => v.user.pushTokens[0]?.token)
                .filter((token): token is string => Boolean(token)),
            title: "New Delivery Available",
            body: "A new order is waiting for pickup. Accept now to grab this opportunity!",
            androidChannelId: "new_orders",
            data: {
                event: "NEW_ORDER",
                orderId: `${order.id}`,
            }
        })
        if (attempt < 3) {
            await dispatchQueue.add(
                'dispatch-order',
                { orderId, attempt: attempt + 1 },
                { delay: ORDER_DELAY, jobId: `dispatch:${orderId}:${attempt + 1}` }
            );
        }
    } catch (error) {
        console.error(error)
    }
}, { connection: redis });
