import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CakeIcon from '@mui/icons-material/Cake';
import WorkIcon from '@mui/icons-material/Work';
import FaceIcon from '@mui/icons-material/Face';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { pink, blue, purple, teal, amber } from '@mui/material/colors';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';
import { getAvatarByAgeAndGender } from '@/utils/avatarUtils';

interface Employee {
  id: string;
  name: string;
  性别: string;
  age: number;
  department: string;
  position?: string;
  birth_date?: string;
  hire_date?: string;
  出生日期?: string;
  入职日期?: string;
  年龄?: number;
}

interface BirthdayEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  loading: boolean;
  error: string | null;
}

const BirthdayEmployeeDialog: React.FC<BirthdayEmployeeDialogProps> = ({ 
  open, 
  onClose, 
  employees, 
  loading, 
  error 
}) => {
  const { width, height } = useWindowSize();
  const currentMonth = new Date().getMonth() + 1;
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // 当对话框打开时显示彩带效果
  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);
  
  // 从出生日期中提取日期
  const getBirthDay = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.getDate();
    } catch (e) {
      return '';
    }
  };
  
  // 获取头像背景色
  const getAvatarColor = (gender: string) => {
    return gender === '女' ? pink[400] : blue[400];
  };
  
  // 格式化日期显示
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };
  
  // 获取员工年龄
  const getEmployeeAge = (employee: Employee) => {
    if (typeof employee.age === 'number') return employee.age;
    if (typeof employee.年龄 === 'number') return employee.年龄;
    return '';
  };
  
  // 获取员工入职日期
  const getHireDate = (employee: Employee) => {
    return employee.入职日期 || employee.hire_date || '';
  };
  
  // 处理员工卡片点击
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
    }, 2000);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #fff9fa 0%, #fff8fb 100%)',
          boxShadow: '0 10px 40px rgba(255, 105, 180, 0.2)',
          overflow: 'hidden'
        }
      }}
    >
      {open && showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={150}
          gravity={0.05}
          colors={[pink[200], pink[300], pink[400], amber[300], amber[400], '#FFD700', '#87CEFA']}
        />
      )}
      
      <Box sx={{ 
        position: 'relative',
        background: 'linear-gradient(90deg, #FF69B4, #FFB6C1)',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: 'white',
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderBottom: '3px dashed #FFF'
      }}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.2)',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CakeIcon sx={{ fontSize: 28, mr: 1 }} />
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
            本月生日员工
          </Typography>
          <CakeIcon sx={{ fontSize: 28, ml: 1 }} />
        </Box>
        
        <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
          祝{currentMonth}月生日的{employees?.length || 0}位同事生日快乐！
        </Typography>
      </Box>
      
      <DialogContent sx={{ p: 2, bgcolor: 'rgba(255,240,245,0.5)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress sx={{ color: pink[400], mb: 2 }} />
            <Typography sx={{ color: pink[300] }}>正在加载生日员工信息...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" align="center">
              {error}
            </Typography>
          </Box>
        ) : employees && employees.length > 0 ? (
          <Grid container spacing={2}>
            {employees.map((employee) => {
              // 获取生日日期
              const birthDate = employee.出生日期 || employee.birth_date || '';
              const birthDay = getBirthDay(birthDate);
              
              // 获取入职日期
              const hireDate = getHireDate(employee);
              
              // 获取年龄
              const age = getEmployeeAge(employee);
              
              // 判断是否是选中的员工
              const isSelected = selectedEmployee?.id === employee.id;
              
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
                  <Card sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    boxShadow: isSelected ? `0 0 15px ${pink[300]}` : '0 2px 8px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 16px rgba(255,105,180,0.15)'
                    },
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? `2px solid ${pink[400]}` : 'none'
                  }}
                  onClick={() => handleEmployeeClick(employee)}
                  >
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      right: 0,
                      bgcolor: pink[400],
                      color: 'white',
                      px: 1.5,
                      py: 0.3,
                      borderBottomLeftRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {currentMonth}月{birthDay}日
                    </Box>
                    
                    <Box sx={{ 
                      p: 1.5, 
                      display: 'flex', 
                      alignItems: 'center',
                      bgcolor: isSelected ? 'rgba(255,220,235,0.7)' : 'rgba(255,240,245,0.7)'
                    }}>
                      <Avatar 
                        sx={{ 
                          width: 50, 
                          height: 50, 
                          bgcolor: getAvatarColor(employee.性别),
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          border: '2px solid white',
                          animation: isSelected ? 'pulse 1.5s infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': {
                              boxShadow: '0 0 0 0 rgba(255, 105, 180, 0.7)'
                            },
                            '70%': {
                              boxShadow: '0 0 0 6px rgba(255, 105, 180, 0)'
                            },
                            '100%': {
                              boxShadow: '0 0 0 0 rgba(255, 105, 180, 0)'
                            }
                          }
                        }}
                      >
                        <img 
                          src={getAvatarByAgeAndGender(Number(age) || 30, employee.性别)} 
                          alt={`${employee.性别}员工头像`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Avatar>
                      <Box sx={{ ml: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: pink[700], lineHeight: 1.2 }}>
                          {employee.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.3 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            {employee.性别} · {age}岁
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          <Chip 
                            size="small" 
                            label={employee.department} 
                            sx={{ 
                              bgcolor: purple[50], 
                              color: purple[700], 
                              fontSize: '0.7rem',
                              height: 20
                            }} 
                          />
                          
                          {employee.position && (
                            <Chip 
                              size="small" 
                              label={employee.position} 
                              sx={{ 
                                bgcolor: employee.性别 === '女' ? 'rgba(255,182,193,0.2)' : 'rgba(173,216,230,0.2)',
                                color: employee.性别 === '女' ? pink[700] : blue[700],
                                fontSize: '0.7rem',
                                height: 20
                              }} 
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary' }}>
              本月暂无生日员工
            </Typography>
          </Box>
        )}
        
        {employees && employees.length > 0 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="contained"
              startIcon={<CelebrationIcon />}
              onClick={() => setShowConfetti(true)}
              sx={{
                bgcolor: pink[400],
                '&:hover': {
                  bgcolor: pink[500],
                },
                borderRadius: 8,
                px: 3,
                py: 0.5,
                fontSize: '0.85rem'
              }}
            >
              送上祝福
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BirthdayEmployeeDialog; 