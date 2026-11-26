import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      light: '#e3f2fd',
      main: '#2196f3',
      dark: '#1e88e5',
      200: '#90caf9',
      800: '#1565c0',
      contrastText: '#fff'
    },
    secondary: {
      light: '#ede7f6',
      main: '#673ab7',
      dark: '#5e35b1',
      200: '#b39ddb',
      800: '#4527a0',
      contrastText: '#fff'
    },
    success: {
      light: '#b9f6ca',
      main: '#00e676',
      dark: '#00c853'
    },
    error: {
      light: '#ef9a9a',
      main: '#f44336',
      dark: '#c62828'
    },
    warning: {
      light: '#fff8e1',
      main: '#ffe57f',
      dark: '#ffc107'
    },
    grey: {
      50: '#f8fafc',
      100: '#eef2f6',
      200: '#e3e8ef',
      300: '#cdd5df',
      500: '#697586',
      600: '#4b5565',
      700: '#364152',
      900: '#121926'
    },
    text: {
      primary: '#364152',
      secondary: '#697586',
      dark: '#121926',
      heading: '#121926'
    },
    divider: '#e3e8ef',
    background: {
      paper: '#fff',
      default: '#fff'
    }
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h6: { fontWeight: 500, fontSize: '0.75rem' },
    h5: { fontSize: '0.875rem', fontWeight: 500 },
    h4: { fontSize: '1rem', fontWeight: 600 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    h2: { fontSize: '1.5rem', fontWeight: 700 },
    h1: { fontSize: '2.125rem', fontWeight: 700 },
    subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.75rem', fontWeight: 400 },
    caption: { fontSize: '0.75rem', fontWeight: 400 },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.334em' },
    body2: { letterSpacing: '0em', fontWeight: 400, lineHeight: '1.5em' },
    button: { textTransform: 'capitalize' }
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 8 }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { color: '#121926', padding: 24 },
        title: { fontSize: '1.125rem' },
        action: { marginRight: 0 }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 24 }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e3e8ef',
          '&.MuiTableCell-head': {
            color: '#121926',
            fontSize: '0.875rem',
            fontWeight: 500
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cdd5df' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#e3f2fd' },
          '&.MuiInputBase-multiline': { padding: 8 }
        },
        input: {
          fontWeight: 500,
          padding: '15.5px 14px',
          '&.MuiInputBase-inputSizeSmall': {
            padding: '10px 14px',
            '&.MuiInputBase-inputAdornedStart': { paddingLeft: 0 }
          }
        },
        inputAdornedStart: { paddingLeft: 4 },
        notchedOutline: { borderRadius: 8 }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: { padding: '12px 0' }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#e3e8ef' }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            color: '#673ab7',
            backgroundColor: '#ede7f6',
            '&:hover': { backgroundColor: '#ede7f6' }
          }
        }
      }
    }
  }
});

export default theme;
