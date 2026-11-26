import { useState } from 'react';
import { Link as RouterLink, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Breadcrumbs,
  Card,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getStoredUser } from '../utils/session.js';
import {
  IconCalendar,
  IconCash,
  IconChevronRight,
  IconFileInvoice,
  IconHeartbeat,
  IconHome,
  IconLogout,
  IconMenu2,
  IconUserCheck,
  IconUsers
} from '@tabler/icons-react';
import HomeIcon from '@mui/icons-material/Home';

const drawerWidth = 260;
const miniDrawerWidth = 72;
const menuItems = [
  { title: 'Inicio', url: '/', icon: IconHome },
  { title: 'Citas', url: '/citas', icon: IconCalendar },
  { title: 'Pacientes', url: '/pacientes', icon: IconUsers },
  { title: 'Servicios', url: '/servicios', icon: IconHeartbeat },
  { title: 'Pagos', url: '/pagos', icon: IconCash },
  { title: 'Facturación', url: '/facturacion', icon: IconFileInvoice },
  { title: 'Terapeutas', url: '/terapeutas', icon: IconUserCheck }
];

function NavigationContent({ expanded, onNavigate, items }) {
  return (
    <Box component="nav" aria-label="Consultorio" sx={{ pt: 2, px: expanded ? 2 : 1 }}>
      {expanded && (
        <Typography
          variant="caption"
          sx={{ display: 'block', px: 0.75, pt: 1.25, pb: 1.5, color: 'text.primary', fontSize: '0.875rem', fontWeight: 500 }}
        >
          Consultorio
        </Typography>
      )}
      <List disablePadding>
        {items.map(({ title, url, icon: Icon }) => (
          <ListItemButton
            key={url}
            component={NavLink}
            to={url}
            end={url === '/'}
            onClick={onNavigate}
            sx={{
              mb: 0.5,
              py: 1.25,
              justifyContent: expanded ? 'initial' : 'center',
              px: expanded ? 2 : 1,
              '&:hover': { color: 'secondary.main', backgroundColor: 'secondary.light' },
              '&.active': {
                color: 'secondary.dark',
                backgroundColor: 'secondary.light',
                '& .MuiListItemIcon-root': { color: 'secondary.dark' },
                '& .MuiListItemText-primary': { fontWeight: 500 }
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: expanded ? 36 : 0,
                justifyContent: 'center',
                color: 'inherit'
              }}
            >
              <Icon size={20} stroke={1.5} />
            </ListItemIcon>
            {expanded && <ListItemText primary={title} primaryTypographyProps={{ variant: 'body1' }} />}
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ mt: 0.25, mb: 1.25 }} />
    </Box>
  );
}

function PageBreadcrumbs({ title }) {
  return (
    <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
      <Box sx={{ p: 1.25, px: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Breadcrumbs
            aria-label="breadcrumb"
            separator={<IconChevronRight stroke={1.5} size={16} />}
            sx={{ '& .MuiBreadcrumbs-separator': { width: 16, mx: 0.75 } }}
          >
            <Link component={RouterLink} to="/" variant="h6" sx={{ display: 'flex', color: 'text.secondary' }}>
              <HomeIcon sx={{ width: 16, height: 16, color: 'secondary.main' }} />
            </Link>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              {title}
            </Typography>
          </Breadcrumbs>
        </Box>
      </Box>
    </Card>
  );
}

function Footer() {
  return (
    <Box sx={{ pt: 3, mt: 'auto' }}>
      <Typography variant="caption">
        © Consultorio Eli Ruiz &amp; Cía.
      </Typography>
    </Box>
  );
}

export default function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const usuario = getStoredUser();
  const visibleMenuItems = usuario?.rol === 'terapeuta' ? menuItems.slice(0, 1) : menuItems;
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPage = visibleMenuItems.find((item) => item.url === pathname)?.title || 'Inicio';

  const closeMobileDrawer = () => setMobileOpen(false);
  const toggleDrawer = () => {
    if (isMobile) setMobileOpen((open) => !open);
    else setExpanded((open) => !open);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/pages/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', height: 88, px: 2, gap: 1.25 }}>
        <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: 'primary.light', color: 'primary.main' }}>
          <IconHeartbeat size={20} stroke={1.5} />
        </Avatar>
        <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600 }}>
          Consultorio
        </Typography>
      </Box>
      <NavigationContent expanded={isMobile || expanded} onNavigate={closeMobileDrawer} items={visibleMenuItems} />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          zIndex: theme.zIndex.drawer + 1,
          height: 88,
          justifyContent: 'center'
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important', px: 2, gap: 1.5 }}>
          <IconButton
            aria-label="Abrir o contraer menú"
            onClick={toggleDrawer}
            sx={{
              width: 34,
              height: 34,
              p: 0,
              borderRadius: '8px',
              color: 'secondary.dark',
              bgcolor: 'secondary.light',
              '&:hover': { color: 'secondary.light', bgcolor: 'secondary.dark' }
            }}
          >
            <IconMenu2 size={20} stroke={1.5} />
          </IconButton>
          <Typography
            variant="h3"
            onClick={() => navigate('/')}
            sx={{ cursor: 'pointer', fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            Consultorio Eli Ruiz &amp; Cía.
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<IconLogout size={18} />}
            onClick={handleLogout}
            sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'uppercase' }}
          >
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onClose={closeMobileDrawer}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: drawerWidth, borderRight: 'none', bgcolor: 'background.paper' } }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: expanded ? drawerWidth : miniDrawerWidth,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            '& .MuiDrawer-paper': {
              width: expanded ? drawerWidth : miniDrawerWidth,
              overflowX: 'hidden',
              borderRight: 'none',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration:
                  theme.transitions.duration[expanded ? 'enteringScreen' : 'leavingScreen'] + 200
              })
            }
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          minWidth: 0,
          width: '100%',
          minHeight: 'calc(100vh - 88px)',
          flexGrow: 1,
          p: { xs: 2, md: 2.5 },
          mt: '88px',
          mr: { xs: 1.25, md: 2.5 },
          ml: isMobile ? { xs: 1.25, sm: 2.5 } : 0,
          borderRadius: 8,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          bgcolor: 'grey.100'
        }}
      >
        <Box sx={{ minHeight: 'calc(100vh - 128px)', display: 'flex', flexDirection: 'column' }}>
          <PageBreadcrumbs title={currentPage} />
          <Outlet />
          <Footer />
        </Box>
      </Box>
    </Box>
  );
}
