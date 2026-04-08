import { Worker, Job } from 'bullmq';
import haversine from 'haversine-distance';
import { DeliveryType, DispatchStatus, DeliveryStatus } from '../types';
import { dispatchQueue, prisma, redis } from '../servers';
import { ORDER_DELAY } from '../constants';
import { sendNotification } from '../servers/firebase';




new Worker('dispatch-queue', async (job: Job) => {
    try {
        const { orderId, attempt } = job.data;
        const order = await prisma.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
        console.log(order, DeliveryStatus.READY, DeliveryType.NORMAL)
        if (!order || !order.delivery || order.delivery.status !== DeliveryStatus.READY || order.delivery.type !== DeliveryType.NORMAL) return;
        const delivery = order.delivery
        const drivers = await prisma.driver.findMany({
            // where: {
            //     isAvailable: true,
            //     online: true,
            // },
            select: {
                id: true,
                userId: true,
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
        console.log(drivers)
        const nearbyDrivers = drivers
        // .filter((d) => {
        //     const dist = haversine(
        //         { lat: order.locationLat, lng: order.locationLng },
        //         { lat: d.latitude, lng: d.longitude }
        //     );
        //     return dist < 3000;
        // });


        const targetDrivers = nearbyDrivers.slice(0, 3);
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
            targetDrivers.map((d) =>
                prisma.orderDispatch.create({
                    data: {
                        orderId: order.id,
                        deliveryId: delivery.id,
                        driverId: d.userId,
                        status: DispatchStatus.SENT,
                        sentAt: new Date(),
                        expiresAt
                    },
                })
            )
        );


        sendNotification({
            tokens: drivers
                .map(v => v.user.pushTokens[0]?.token)
                .filter((token): token is string => Boolean(token)),
            title: "New Delivery Available",
            body: "A new order is waiting for pickup. Accept now to grab this opportunity!",
            data: {
                event: "NEW_ORDER",
                orderId: `${order.id}`,
            }
        })
        await dispatchQueue.add(
            'dispatch-order',
            { orderId, attempt: attempt + 1 },
            { delay: ORDER_DELAY, jobId: `dispatch:${orderId}:${attempt + 1}` }
        );
    } catch (error) {
        console.log(error)
    }
}, { connection: redis });
