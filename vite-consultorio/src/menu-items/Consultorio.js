import {
    IconHome,
    IconCalendar,
    IconUsers,
    IconHeartbeat,
    IconCash,
    IconFileInvoice,
    IconUserCheck
} from '@tabler/icons-react';

const consultorio = {
    id: 'consultorio',
    title: 'Consultorio',
    type: 'group',
    children: [
        {
            id: 'inicio',
            title: 'Inicio',
            type: 'item',
            url: '/',
            icon: IconHome,
            breadcrumbs: true
        },
        {
            id: 'citas',
            title: 'Citas',
            type: 'item',
            url: '/citas',
            icon: IconCalendar,
            breadcrumbs: true
        },
        {
            id: 'pacientes',
            title: 'Pacientes',
            type: 'item',
            url: '/pacientes',
            icon: IconUsers,
            breadcrumbs: true
        },
        {
            id: 'servicios',
            title: 'Servicios',
            type: 'item',
            url: '/servicios',
            icon: IconHeartbeat,
            breadcrumbs: true
        },
        {
            id: 'pagos',
            title: 'Pagos',
            type: 'item',
            url: '/pagos',
            icon: IconCash,
            breadcrumbs: true
        },
        {
            id: 'facturacion',
            title: 'Facturación',
            type: 'item',
            url: '/facturacion',
            icon: IconFileInvoice,
            breadcrumbs: true
        },
        {
            id: 'terapeutas',
            title: 'Terapeutas',
            type: 'item',
            url: '/terapeutas',
            icon: IconUserCheck,
            breadcrumbs: true
        }
    ]
};

export default consultorio;