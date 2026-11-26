import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';

export default function PageCard({ children, title, secondary, ...cardProps }) {
  return (
    <Card
      {...cardProps}
      sx={{
        border: 'none',
        ':hover': { boxShadow: 'inherit' },
        ...(cardProps.sx || {})
      }}
    >
      {title && <CardHeader title={title} action={secondary} />}
      {title && <Divider />}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
